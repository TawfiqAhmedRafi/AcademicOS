"""
MongoDB persistence for match items.

Thin layer: connect, ensure indexes, upsert, load, verify, rollback.
No search logic here (that stays in engine.py).

Allowed collections (the service user may only touch these):
    matchitems      — the item documents
    matchbatches    — one document per import run
    matchlogs       — (reserved, not yet used)
    matchvocab      — (reserved, not yet used)

Every document written by this tool carries  source: "aos_match"  so we can
distinguish our data from anything else in the database.
"""
from __future__ import annotations

import logging
import os
import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pymongo import ASCENDING, IndexModel, UpdateOne
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.errors import BulkWriteError, ConnectionFailure, ServerSelectionTimeoutError

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
SOURCE_TAG = "aos_match"

COL_ITEMS   = "matchitems"
COL_BATCHES = "matchbatches"
COL_LOGS    = "matchlogs"
COL_VOCAB   = "matchvocab"
ALLOWED_COLLECTIONS = frozenset({COL_ITEMS, COL_BATCHES, COL_LOGS, COL_VOCAB})

# Field mapping: in-memory "roll" is stored as "student_id" in the DB.
_TO_DB   = {"roll": "student_id"}
_FROM_DB = {"student_id": "roll"}

# ── Expected counts after a full import ──────────────────────────────────────
EXPECTED_COUNTS = {
    ("project", "ETE2200", "21"): 52,
    ("project", "ETE2200", "22"): 57,
    ("project", "ETE2200", "23"): 44,
    ("project", "ETE3200", "21"): 52,
    ("project", "ETE3200", "22"): 30,
    ("thesis",  "ETE4200", "18"): 53,
    ("thesis",  "ETE4200", "19"): 54,
    ("thesis",  "ETE4200", "20"): 56,
}


# ── Document shape converters ────────────────────────────────────────────────

def _to_db_doc(item: dict, batch_id: str) -> dict:
    """Convert an in-memory item dict to the MongoDB document shape."""
    doc = {}
    for k, v in item.items():
        doc[_TO_DB.get(k, k)] = v
    doc.pop("_id", None)
    doc["source"] = SOURCE_TAG
    doc["importBatch"] = batch_id
    return doc


def _from_db_doc(doc: dict) -> dict:
    """Convert a MongoDB document back to the in-memory item shape."""
    item = {}
    for k, v in doc.items():
        if k in ("_id", "source", "importBatch", "updatedBatch"):
            continue
        item[_FROM_DB.get(k, k)] = v
    return item


# ── Connection ───────────────────────────────────────────────────────────────

def connect(uri: str | None = None, db_name: str | None = None,
            timeout_ms: int = 5000) -> Database:
    """Return a pymongo Database handle.  Raises RuntimeError on failure.
    Never logs the URI (may contain credentials)."""
    from pymongo import MongoClient
    uri = uri or os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = db_name or os.getenv("MONGO_DB", "academicos")
    
    if uri.startswith("mongomock://"):
        import mongomock
        client = mongomock.MongoClient()
        return client[db_name]

    client = MongoClient(uri, serverSelectionTimeoutMS=timeout_ms)
    try:
        client.admin.command("ping")
    except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
        raise RuntimeError(
            f"Cannot connect to MongoDB (db={db_name}).  "
            "Check MONGO_URI in .env and ensure mongod is running."
        ) from exc
    logger.info("Connected to MongoDB (db=%s)", db_name)
    return client[db_name]


def _col(db: Database) -> Collection:
    return db[COL_ITEMS]


def _mask_host(uri: str) -> str:
    """Return 'host:port' with password masked.  Never show the full URI."""
    m = re.search(r"@([^/]+)", uri)
    if m:
        return m.group(1)
    m = re.search(r"//([^/]+)", uri)
    return m.group(1) if m else "***"


# ── Indexes (idempotent) ────────────────────────────────────────────────────

def ensure_indexes(db: Database) -> None:
    """Create required indexes.  Safe to call repeatedly."""
    _col(db).create_indexes([
        IndexModel([("id", ASCENDING)], unique=True, name="id_unique"),
        IndexModel([("type", ASCENDING), ("course", ASCENDING)], name="type_course"),
        IndexModel([("course", ASCENDING), ("series", ASCENDING)], name="course_series"),
        IndexModel([("importBatch", ASCENDING)], name="import_batch"),
    ])
    
    # Logs: TTL index for 180 days (15552000 seconds)
    db[COL_LOGS].create_indexes([
        IndexModel([("ts", ASCENDING)], expireAfterSeconds=15552000, name="ttl_180_days"),
    ])
    logger.info("Indexes ensured on %s and %s", COL_ITEMS, COL_LOGS)

def load_vocab(db: Database) -> dict[str, list[tuple[str, str]] | set[str]]:
    """Load editable vocabulary from DB."""
    synonyms = []
    phrases = []
    stopwords = set()
    
    for doc in db[COL_VOCAB].find({"enabled": {"$ne": False}}):
        k = doc.get("kind")
        if k == "synonym":
            synonyms.append((doc["from"], doc["to"]))
        elif k == "phrase":
            phrases.append((doc["from"], doc["to"]))
        elif k == "stopword":
            stopwords.add(doc["from"])
            
    return {"synonym": synonyms, "phrase": phrases, "stopword": stopwords}


# ── Pre-flight checks ───────────────────────────────────────────────────────

def preflight(db: Database, *, yes: bool = False,
              i_know_this_is_main: bool = False) -> None:
    """Safety checks before any write.  Raises SystemExit on failure."""
    uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    db_name = db.name

    # Print basic info (never print URI or credentials)
    existing_cols = sorted(db.list_collection_names())
    item_count = _col(db).count_documents({})
    print(f"Host (masked): {_mask_host(uri)}")
    print(f"Database:      {db_name}")
    print(f"Collections:   {existing_cols or '(none)'}")
    print(f"{COL_ITEMS} docs: {item_count}")

    # Name-clash check: if matchitems has documents NOT written by us, abort.
    if item_count > 0:
        foreign = _col(db).count_documents({"source": {"$ne": SOURCE_TAG}})
        if foreign > 0:
            print(f"\nABORT: {COL_ITEMS} contains {foreign} documents without "
                  f"source:\"{SOURCE_TAG}\".  This looks like someone else's data.")
            raise SystemExit(1)

    # Production guard
    if yes:
        prod_patterns = re.compile(r"prod|production|main|live", re.I)
        if prod_patterns.search(db_name) and not i_know_this_is_main:
            print(f"\nABORT: MONGO_DB={db_name!r} looks like production.  "
                  "Pass --i-know-this-is-main to override.")
            raise SystemExit(1)
        return  # skip interactive confirmation in CI

    # Interactive: type the DB name to continue
    answer = input(f"\nType the database name ({db_name}) to continue, or Ctrl-C to abort: ")
    if answer.strip() != db_name:
        print("Names do not match.  Aborting.")
        raise SystemExit(1)


# ── Load ─────────────────────────────────────────────────────────────────────

def load_all(db: Database) -> list[dict]:
    """Return every item from Mongo, mapped to the in-memory shape."""
    docs = list(_col(db).find({}, {"_id": 0}))
    return [_from_db_doc(d) for d in docs]


def total_count(db: Database) -> int:
    return _col(db).count_documents({})


def count_by_scope(db: Database) -> list[dict]:
    pipeline = [
        {"$group": {"_id": {"type": "$type", "course": "$course", "series": "$series"},
                     "count": {"$sum": 1}}},
        {"$sort": {"_id.type": 1, "_id.course": 1, "_id.series": 1}},
    ]
    return [
        {"type": r["_id"]["type"], "course": r["_id"]["course"],
         "series": r["_id"]["series"], "count": r["count"]}
        for r in _col(db).aggregate(pipeline)
    ]


# ── Upsert (bulk) ────────────────────────────────────────────────────────────

class UpsertReport:
    __slots__ = ("inserted", "updated", "unchanged", "skipped", "errors")

    def __init__(self):
        self.inserted = 0
        self.updated = 0
        self.unchanged = 0
        self.skipped: list[tuple[str, str]] = []
        self.errors: list[str] = []

    @property
    def ok(self) -> bool:
        return not self.errors

    def summary(self) -> str:
        parts = [f"inserted={self.inserted}", f"updated={self.updated}",
                 f"unchanged={self.unchanged}"]
        if self.skipped:
            parts.append(f"skipped={len(self.skipped)}")
        if self.errors:
            parts.append(f"ERRORS={len(self.errors)}")
        return "  ".join(parts)


def bulk_upsert(db: Database, items: list[dict], batch_id: str,
                *, dry_run: bool = False) -> UpsertReport:
    """Upsert items by id.  Existing docs are updated only if content changed."""
    report = UpsertReport()
    col = _col(db)

    # Fetch existing docs for comparison
    existing = {d["id"]: d for d in col.find({}, {"_id": 0})}

    ops: list[Any] = []
    for it in items:
        doc = _to_db_doc(it, batch_id)
        old = existing.get(it["id"])
        if old is None:
            report.inserted += 1
            if not dry_run:
                ops.append(UpdateOne({"id": it["id"]}, {"$set": doc}, upsert=True))
        elif _content_changed(old, doc):
            report.updated += 1
            if not dry_run:
                doc["updatedBatch"] = batch_id
                ops.append(UpdateOne({"id": it["id"]}, {"$set": doc}))
        else:
            report.unchanged += 1

    if ops:
        try:
            result = col.bulk_write(ops, ordered=False)
            logger.info("Bulk write: upserted=%d modified=%d",
                        result.upserted_count, result.modified_count)
        except BulkWriteError as exc:
            report.errors.append(str(exc.details))
    return report


_COMPARE_FIELDS = ("title", "description", "tags", "type", "course", "series",
                   "student_id", "studentName", "members", "memberNames")


def _content_changed(old: dict, new: dict) -> bool:
    for key in _COMPARE_FIELDS:
        if old.get(key) != new.get(key):
            return True
    return False


# ── Series-level stale removal ───────────────────────────────────────────────

def remove_stale(db: Database, course: str, series: str,
                 keep_ids: set[str], *, dry_run: bool = False) -> list[str]:
    """Remove items from (course, series) whose id is NOT in keep_ids.
    ONLY touches documents with source:"aos_match"."""
    col = _col(db)
    stale = [d["id"] for d in col.find(
        {"course": course, "series": series,
         "source": SOURCE_TAG,
         "id": {"$nin": list(keep_ids)}},
        {"id": 1, "_id": 0}
    )]
    if stale and not dry_run:
        col.delete_many({"id": {"$in": stale}, "source": SOURCE_TAG})
        logger.info("Removed %d stale items from %s series %s", len(stale), course, series)
    return stale


# ── Batch tracking ───────────────────────────────────────────────────────────

def new_batch_id() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid4().hex[:6]


def record_batch(db: Database, batch_id: str, files: list[str],
                 counts: dict) -> None:
    db[COL_BATCHES].insert_one({
        "batchId": batch_id,
        "createdAt": datetime.now(timezone.utc),
        "files": files,
        "counts": counts,
        "tool": SOURCE_TAG,
    })


def list_batches(db: Database) -> list[dict]:
    return list(db[COL_BATCHES].find({}, {"_id": 0}).sort("createdAt", -1))


def rollback_batch(db: Database, batch_id: str, *, dry_run: bool = False) -> int:
    """Delete documents inserted by a specific batch (source must be aos_match)."""
    col = _col(db)
    filt = {"importBatch": batch_id, "source": SOURCE_TAG}
    count = col.count_documents(filt)
    if not dry_run and count > 0:
        col.delete_many(filt)
        db[COL_BATCHES].delete_one({"batchId": batch_id})
        logger.info("Rolled back batch %s: %d items deleted", batch_id, count)
    return count


# ── Verification ─────────────────────────────────────────────────────────────

def verify(db: Database) -> bool:
    """Print verification report.  Returns True if all checks pass."""
    col = _col(db)
    counts = {(r["type"], r["course"], r["series"]): r["count"]
              for r in count_by_scope(db)}

    all_ok = True
    total = 0
    print(f"{'type':10s} {'course':10s} {'series':8s} {'expected':>8s} {'actual':>8s}  status")
    for key, expected in sorted(EXPECTED_COUNTS.items()):
        actual = counts.get(key, 0)
        total += actual
        ok = actual == expected
        if not ok:
            all_ok = False
        status = "PASS" if ok else "FAIL"
        print(f"{key[0]:10s} {key[1]:10s} {key[2]:8s} {expected:8d} {actual:8d}  {status}")

    for key, cnt in sorted(counts.items()):
        if key not in EXPECTED_COUNTS:
            print(f"{key[0]:10s} {key[1]:10s} {key[2]:8s} {'?':>8s} {cnt:8d}  UNEXPECTED")
            all_ok = False

    no_roll = col.count_documents({"student_id": None})
    print(f"\nTotal items in DB: {col.count_documents({})}")
    print(f"Items without student_id: {no_roll}")

    # Duplicate id check
    pipeline = [
        {"$group": {"_id": "$id", "n": {"$sum": 1}}},
        {"$match": {"n": {"$gt": 1}}},
    ]
    dupes = list(col.aggregate(pipeline))
    print(f"Duplicate ids: {len(dupes)}")
    if dupes:
        all_ok = False
        for d in dupes:
            print(f"  id={d['_id']}  count={d['n']}")

    print(f"\nOverall: {'PASS' if all_ok else 'FAIL'}")
    return all_ok


# ── Safety audit helpers ─────────────────────────────────────────────────────

def collections_snapshot(db: Database) -> list[str]:
    """Return sorted list of existing collection names."""
    return sorted(db.list_collection_names())
