"""
Mongo store tests using mongomock (no real database needed in CI).

Tests:
  - idempotent double import (import twice -> same counts, no duplicates)
  - a changed description updates the existing doc and keeps the same id
  - --dry-run writes nothing
  - name-clash abort (foreign documents in the collection)
  - rollback removes only that batch
  - --replace-series never touches other sources
  - verify fails when a row is missing
  - search after reindex from Mongo returns a known result
  - a 2200 search never returns a 3200 item
"""
import mongomock
import pytest

from aos_match import store
from aos_match.engine import MatchEngine
from aos_match.importer import read_all_excel, stable_id
from aos_match.tagger import tag_item


@pytest.fixture
def mock_db():
    """Fresh mongomock database for each test."""
    client = mongomock.MongoClient()
    db = client["test_aos_match"]
    store.ensure_indexes(db)
    return db


@pytest.fixture
def sample_items():
    """Load real items from data/raw/ Excel files (reuses existing importer)."""
    items, skipped, file_names, had_unrec = read_all_excel()
    assert not had_unrec, "Unrecognised files in data/raw/"
    assert len(items) == 398, f"Expected 398 items, got {len(items)}"
    return items


# ── Idempotent double import ────────────────────────────────────────────────

def test_idempotent_double_import(mock_db, sample_items):
    """Importing twice gives same counts, no duplicates."""
    batch1 = store.new_batch_id()
    r1 = store.bulk_upsert(mock_db, sample_items, batch1)
    assert r1.inserted == 398
    assert r1.updated == 0
    assert r1.unchanged == 0

    batch2 = store.new_batch_id()
    r2 = store.bulk_upsert(mock_db, sample_items, batch2)
    assert r2.inserted == 0
    assert r2.updated == 0
    assert r2.unchanged == 398

    # No duplicate ids
    pipeline = [
        {"$group": {"_id": "$id", "n": {"$sum": 1}}},
        {"$match": {"n": {"$gt": 1}}},
    ]
    dupes = list(mock_db[store.COL_ITEMS].aggregate(pipeline))
    assert dupes == [], f"Duplicate ids: {dupes}"


# ── Changed description updates doc, keeps id ────────────────────────────────

def test_changed_description_updates_keeps_id(mock_db):
    """When a description changes, the doc is updated but keeps the same id."""
    item = {
        "id": "p_test_001", "type": "project", "course": "ETE2200", "series": "99",
        "roll": "9999001", "studentName": "Test Student", "title": "Test Project",
        "description": "Original description", "members": ["9999001"],
        "memberNames": ["Test Student"], "tags": {"domain": ["Other"], "technique": []},
        "source": "test.xlsx:row1",
    }
    batch1 = "batch-1"
    r1 = store.bulk_upsert(mock_db, [item], batch1)
    assert r1.inserted == 1

    # Change description
    item2 = dict(item)
    item2["description"] = "Updated description"
    batch2 = "batch-2"
    r2 = store.bulk_upsert(mock_db, [item2], batch2)
    assert r2.updated == 1
    assert r2.inserted == 0

    # Verify the doc was updated
    doc = mock_db[store.COL_ITEMS].find_one({"id": "p_test_001"}, {"_id": 0})
    assert doc["description"] == "Updated description"
    assert doc["id"] == "p_test_001"  # id unchanged
    assert doc["updatedBatch"] == "batch-2"


# ── Dry run writes nothing ──────────────────────────────────────────────────

def test_dry_run_writes_nothing(mock_db, sample_items):
    """--dry-run reports counts but writes no documents."""
    batch = store.new_batch_id()
    r = store.bulk_upsert(mock_db, sample_items, batch, dry_run=True)
    assert r.inserted == 398
    assert r.updated == 0
    assert r.unchanged == 0

    # Nothing was actually written
    assert store.total_count(mock_db) == 0


# ── Name-clash abort ─────────────────────────────────────────────────────────

def test_name_clash_aborts(mock_db):
    """preflight aborts if matchitems contains docs without source:aos_match."""
    # Insert a foreign document
    mock_db[store.COL_ITEMS].insert_one({
        "id": "foreign_001", "type": "other", "source": "not_ours"
    })

    with pytest.raises(SystemExit):
        store.preflight(mock_db, yes=True)


# ── Rollback removes only that batch ────────────────────────────────────────

def test_rollback_removes_only_that_batch(mock_db):
    """Rollback deletes only documents from the specified batch."""
    items_a = [{
        "id": f"p_a_{i}", "type": "project", "course": "ETE2200", "series": "21",
        "roll": None, "studentName": None, "title": f"Project A{i}",
        "description": "desc A", "members": [], "memberNames": [],
        "tags": {"domain": ["Other"], "technique": []}, "source": "a.xlsx:row1",
    } for i in range(3)]
    items_b = [{
        "id": f"p_b_{i}", "type": "project", "course": "ETE2200", "series": "21",
        "roll": None, "studentName": None, "title": f"Project B{i}",
        "description": "desc B", "members": [], "memberNames": [],
        "tags": {"domain": ["Other"], "technique": []}, "source": "b.xlsx:row1",
    } for i in range(2)]

    store.bulk_upsert(mock_db, items_a, "batch-a")
    store.bulk_upsert(mock_db, items_b, "batch-b")
    store.record_batch(mock_db, "batch-a", ["a.xlsx"], {})
    store.record_batch(mock_db, "batch-b", ["b.xlsx"], {})
    assert store.total_count(mock_db) == 5

    # Rollback batch-a
    count = store.rollback_batch(mock_db, "batch-a")
    assert count == 3
    assert store.total_count(mock_db) == 2

    # batch-b items are still there
    remaining = [d["id"] for d in mock_db[store.COL_ITEMS].find({}, {"id": 1, "_id": 0})]
    assert set(remaining) == {"p_b_0", "p_b_1"}


# ── replace-series never touches other sources ───────────────────────────────

def test_replace_series_respects_source(mock_db):
    """remove_stale only deletes docs with source:aos_match."""
    # Insert an "ours" doc and a "foreign" doc in the same scope
    mock_db[store.COL_ITEMS].insert_one({
        "id": "ours_1", "type": "project", "course": "ETE2200", "series": "21",
        "source": store.SOURCE_TAG, "importBatch": "b1",
    })
    mock_db[store.COL_ITEMS].insert_one({
        "id": "foreign_1", "type": "project", "course": "ETE2200", "series": "21",
        "source": "someone_else", "importBatch": "x",
    })

    # remove_stale with an empty keep set — should remove ours_1 but NOT foreign_1
    removed = store.remove_stale(mock_db, "ETE2200", "21", set())
    assert removed == ["ours_1"]
    assert mock_db[store.COL_ITEMS].count_documents({}) == 1
    assert mock_db[store.COL_ITEMS].find_one({"id": "foreign_1"}) is not None


# ── verify fails when a row is missing ──────────────────────────────────────

def test_verify_fails_when_incomplete(mock_db, sample_items):
    """verify returns False when counts don't match expected."""
    # Insert only a subset
    subset = [it for it in sample_items if it["course"] == "ETE2200" and it["series"] == "21"]
    batch = store.new_batch_id()
    store.bulk_upsert(mock_db, subset, batch)
    assert not store.verify(mock_db)


# ── Search after reindex from Mongo ──────────────────────────────────────────

def test_search_after_reindex_from_mongo(mock_db, sample_items):
    """Engine built from Mongo returns known search results."""
    batch = store.new_batch_id()
    store.bulk_upsert(mock_db, sample_items, batch)

    eng = MatchEngine.from_mongo(mock_db)
    assert len(eng.items) == 398

    # Known search: fingerprint attendance in ETE2200
    r = eng.search("project", "2200", "fingerprint attendance")["results"]
    assert r
    assert "fingerprint" in r[0]["title"].lower() or "attendance" in r[0]["title"].lower()

    # Thesis search: autism
    r = eng.search("thesis", None, "autism")["results"]
    assert len(r) >= 2


# ── Scope isolation persists through Mongo round-trip ────────────────────────

def test_scope_isolation_via_mongo(mock_db, sample_items):
    """A 2200 search on Mongo-backed engine never returns a 3200 item."""
    batch = store.new_batch_id()
    store.bulk_upsert(mock_db, sample_items, batch)
    eng = MatchEngine.from_mongo(mock_db)

    for course in ("2200", "3200"):
        r = eng.search("project", course, "attendance system", top_k=50, min_score=0)
        assert r["results"]
        assert {x["course"] for x in r["results"]} == {f"ETE{course}"}


# ── student_id field mapping ─────────────────────────────────────────────────

def test_student_id_field_mapping(mock_db):
    """roll is stored as student_id in the DB, mapped back on load."""
    item = {
        "id": "p_field_test", "type": "project", "course": "ETE2200", "series": "21",
        "roll": "2104001", "studentName": "Test", "title": "Field Test",
        "description": "Testing field mapping", "members": ["2104001"],
        "memberNames": ["Test"], "tags": {"domain": ["Other"], "technique": []},
        "source": "test.xlsx:row1",
    }
    store.bulk_upsert(mock_db, [item], "batch-field")

    # In DB, the field is student_id
    doc = mock_db[store.COL_ITEMS].find_one({"id": "p_field_test"}, {"_id": 0})
    assert "student_id" in doc
    assert "roll" not in doc
    assert doc["student_id"] == "2104001"

    # Loaded back, it's "roll" again
    loaded = store.load_all(mock_db)
    assert loaded[0]["roll"] == "2104001"
    assert "student_id" not in loaded[0]
