"""
Read the messy Excel files and produce clean MatchItem records.

Handles: header not on row 1 (18.xlsx / 19.xlsx have it on row 7), odd headers
(' Roll', 'TiTle ', 'Project Short Description'), blank rows, missing rolls,
junk extra sheets, and exact duplicates.  Prints a report of anything skipped.

Run:   python -m aos_match.importer                         # Excel -> JSON (original)
       python -m aos_match.importer --to-mongo              # Excel -> MongoDB
       python -m aos_match.importer --to-mongo --dry-run    # preview, write nothing
       python -m aos_match.importer --verify                # check DB counts
       python -m aos_match.importer --rollback <batchId>    # undo a batch
       python -m aos_match.importer --list-batches          # show import history
"""
import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl

from . import config
from .tagger import tag_item


def _clean(v) -> str:
    if v is None:
        return ""
    s = str(v).replace("\xa0", " ")
    return re.sub(r"\s+", " ", s).strip()


def _find_header(rows):
    """Return (row_index, {field: col_index}) for the first row that has a title column."""
    for i, row in enumerate(rows[:25]):
        cells = [_clean(c).lower() for c in row]
        mapping = {}
        for j, c in enumerate(cells):
            if not c:
                continue
            if "roll" in c:
                mapping["roll"] = j
            elif "title" in c:
                mapping["title"] = j
            elif "desc" in c:
                mapping["description"] = j
            elif "name" in c:
                mapping["name"] = j
        if "title" in mapping:
            return i, mapping
    return None, {}


def import_file(path: Path, meta: dict):
    items, skipped = [], []
    wb = openpyxl.load_workbook(path, data_only=True)
    # Use the first sheet that actually contains a header row (skips junk sheets).
    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        h, cols = _find_header(rows)
        if h is not None:
            break
    else:
        return [], [(path.name, 0, "no header row found")]

    for k, row in enumerate(rows[h + 1:], start=h + 2):  # k = Excel row number
        get = lambda f: _clean(row[cols[f]]) if f in cols and cols[f] < len(row) else ""
        title, desc, roll, name = get("title"), get("description"), get("roll"), get("name")
        if not title and not desc:
            continue  # blank row, ignore silently
        if meta["type"] == "project" and not desc:
            skipped.append((path.name, k, "project without description"))
            continue
        if not title:
            skipped.append((path.name, k, "missing title"))
            continue
        roll = re.sub(r"\.0$", "", roll)  # 2104001.0 -> 2104001
        items.append({
            "type": meta["type"],
            "course": meta["course"],
            "series": meta["series"],
            "roll": roll or None,
            "studentName": name or None,
            "title": title,
            "description": desc or None,
            "source": f"{path.name}:row{k}",
        })
    return items, skipped


def detect_meta(stem: str):
    """FILE_MAP wins; otherwise infer from the file name:
         24_2200 / 24_3200  -> project, that course, series 24
         25 / 25_4200 / 25_4100 -> thesis, series 25"""
    if stem in config.FILE_MAP:
        return config.FILE_MAP[stem]
    m = re.fullmatch(r"(\d{2})_(2200|3200)", stem)
    if m:
        return {"type": "project", "course": f"ETE{m.group(2)}", "series": m.group(1)}
    m = re.fullmatch(r"(\d{2})(?:_(?:4100|4200))?", stem)
    if m:
        return {"type": "thesis", "course": "ETE4200", "series": m.group(1)}
    return None


def stable_id(it: dict) -> str:
    """Same item -> same id forever, no matter which other files are added or removed."""
    key = "|".join([it["course"], it["series"], it["title"].lower(), (it["description"] or "").lower()])
    return ("p" if it["type"] == "project" else "t") + hashlib.sha1(key.encode()).hexdigest()[:10]


# ── Excel -> merge -> tag -> id  (shared by JSON and Mongo paths) ────────────

def read_all_excel(raw_dir=config.RAW_DIR, verbose=True):
    """Read all .xlsx files, merge groups, assign ids and tags.
    Returns (items, skipped, file_names, had_unrecognised).
    Does NOT write anything."""
    all_items, all_skipped = [], []
    file_names = []
    had_unrecognised = False

    for p in sorted(Path(raw_dir).glob("*.xlsx")):
        if p.name.startswith("~$"):
            continue
        meta = detect_meta(p.stem)
        if meta is None:
            msg = ("UNRECOGNISED FILE NAME - not imported. "
                   "Use e.g. 24_2200.xlsx, 24_3200.xlsx, 22.xlsx (thesis) "
                   "or add it to FILE_MAP")
            all_skipped.append((p.name, 0, msg))
            had_unrecognised = True
            continue
        file_names.append(p.name)
        it, sk = import_file(p, meta)
        all_items += it
        all_skipped += sk

    # Merge group projects (same project on several rows = different members)
    merged, index = [], {}
    for it in all_items:
        key = (it["course"], it["series"], it["title"].lower(), (it["description"] or "").lower())
        if key in index:
            first = merged[index[key]]
            if it["roll"] and it["roll"] not in first["members"]:
                first["members"].append(it["roll"])
            if it["studentName"] and it["studentName"] not in first["memberNames"]:
                first["memberNames"].append(it["studentName"])
            all_skipped.append((it["source"], 0, f"merged into {first['source']} (same project)"))
            continue
        it["members"] = [it["roll"]] if it["roll"] else []
        it["memberNames"] = [it["studentName"]] if it["studentName"] else []
        index[key] = len(merged)
        merged.append(it)
    unique = merged

    ids = set()
    for it in unique:
        it["id"] = stable_id(it)
        assert it["id"] not in ids, f"id collision {it['id']}"
        ids.add(it["id"])
        it["tags"] = tag_item(it)

    return unique, all_skipped, file_names, had_unrecognised


# ── Original JSON export (unchanged interface) ───────────────────────────────

def run(raw_dir=config.RAW_DIR, out=config.ITEMS_JSON, verbose=True):
    unique, all_skipped, _, _ = read_all_excel(raw_dir, verbose=verbose)

    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text(json.dumps(unique, ensure_ascii=False, indent=1), encoding="utf-8")

    if verbose:
        c = Counter((i["type"], i["course"], i["series"]) for i in unique)
        print(f"Imported {len(unique)} items -> {out}")
        for k, v in sorted(c.items()):
            print(f"  {k[0]:8s} {k[1]}  series {k[2]}: {v}")
        noroll = sum(1 for i in unique if not i["roll"])
        print(f"  items without roll: {noroll} (kept)")
        print(f"Skipped {len(all_skipped)}:")
        for s in all_skipped:
            print("  ", s)
    return unique, all_skipped


# ── Mongo import ─────────────────────────────────────────────────────────────

def _print_counts(items: list[dict], label: str = ""):
    c = Counter((i["type"], i["course"], i["series"]) for i in items)
    if label:
        print(label)
    for k, v in sorted(c.items()):
        print(f"  {k[0]:8s} {k[1]}  series {k[2]}: {v}")
    print(f"  total: {len(items)}")


def run_to_mongo(*, dry_run: bool = False, replace_series: bool = False,
                 yes: bool = False, i_know_this_is_main: bool = False) -> int:
    """Import Excel -> MongoDB.  Returns 0 on success, 1 on failure."""
    from . import store

    # Load .env
    try:
        from dotenv import load_dotenv
        load_dotenv(config.ROOT / ".env")
    except ImportError:
        pass

    # Read Excel
    items, skipped, file_names, had_unrecognised = read_all_excel()

    if had_unrecognised:
        print("\nABORT: unrecognised file names in data/raw/. Fix them first.")
        for s in skipped:
            if "UNRECOGNISED" in s[2]:
                print(f"  {s[0]}: {s[2]}")
        return 1

    # Connect
    try:
        db = store.connect()
    except RuntimeError as exc:
        print(f"\n{exc}")
        return 1

    # Snapshot collections BEFORE
    cols_before = store.collections_snapshot(db)

    # Pre-flight
    if not dry_run:
        store.preflight(db, yes=yes, i_know_this_is_main=i_know_this_is_main)

    # Ensure indexes
    store.ensure_indexes(db)

    # Generate batch id
    batch_id = store.new_batch_id()
    print(f"\nBatch: {batch_id}  dry_run={dry_run}")

    _print_counts(items, "\nItems from Excel:")
    noroll = sum(1 for i in items if not i["roll"])
    print(f"  items without roll: {noroll}")

    # Print skipped/merged (never print names or descriptions)
    if skipped:
        print(f"\nSkipped/merged: {len(skipped)}")
        for src, row, reason in skipped:
            print(f"  {src} row {row}: {reason}")

    # --replace-series: remove stale items per course+series
    if replace_series and not dry_run:
        # Gather ids per (course, series) from current Excel data
        ids_by_scope: dict[tuple[str, str], set[str]] = {}
        for it in items:
            key = (it["course"], it["series"])
            ids_by_scope.setdefault(key, set()).add(it["id"])

        total_stale = 0
        for (course, series), keep_ids in ids_by_scope.items():
            stale = store.remove_stale(db, course, series, keep_ids, dry_run=dry_run)
            if stale:
                print(f"  Removed {len(stale)} stale items from {course} series {series}")
                total_stale += len(stale)
        if total_stale:
            print(f"  Total stale removed: {total_stale}")

    # Bulk upsert
    report = store.bulk_upsert(db, items, batch_id, dry_run=dry_run)
    print(f"\nResult: {report.summary()}")

    if not report.ok:
        print("\nERRORS during write:")
        for e in report.errors:
            print(f"  {e}")
        return 1

    # Record the batch
    if not dry_run:
        counts = dict(Counter((i["type"], i["course"]) for i in items))
        # Convert tuple keys to strings for Mongo
        counts_str = {f"{k[0]}:{k[1]}": v for k, v in counts.items()}
        store.record_batch(db, batch_id, file_names, counts_str)
        print(f"Batch {batch_id} recorded.")

    # Snapshot collections AFTER
    if not dry_run:
        cols_after = store.collections_snapshot(db)
        new_cols = set(cols_after) - set(cols_before)
        if new_cols:
            print(f"\nNew collections created: {sorted(new_cols)}")
        # Check no unexpected collections were created
        unexpected = new_cols - store.ALLOWED_COLLECTIONS
        if unexpected:
            print(f"WARNING: unexpected collections: {sorted(unexpected)}")

    return 0


def run_verify() -> int:
    """Verify DB contents match expected counts.  Returns 0 on pass."""
    from . import store
    try:
        from dotenv import load_dotenv
        load_dotenv(config.ROOT / ".env")
    except ImportError:
        pass

    try:
        db = store.connect()
    except RuntimeError as exc:
        print(f"\n{exc}")
        return 1

    ok = store.verify(db)
    return 0 if ok else 1


def run_rollback(batch_id: str, *, yes: bool = False,
                 i_know_this_is_main: bool = False) -> int:
    """Rollback a specific import batch."""
    from . import store
    try:
        from dotenv import load_dotenv
        load_dotenv(config.ROOT / ".env")
    except ImportError:
        pass

    try:
        db = store.connect()
    except RuntimeError as exc:
        print(f"\n{exc}")
        return 1

    count = store.rollback_batch(db, batch_id, dry_run=True)
    if count == 0:
        print(f"No items found for batch {batch_id}")
        return 1

    print(f"Rollback will delete {count} items from batch {batch_id}")

    if not yes:
        db_name = db.name
        answer = input(f"Type the database name ({db_name}) to continue: ")
        if answer.strip() != db_name:
            print("Names do not match.  Aborting.")
            return 1

    store.rollback_batch(db, batch_id)
    print(f"Rolled back batch {batch_id}: {count} items deleted.")
    return 0


def run_list_batches() -> int:
    """List all import batches."""
    from . import store
    try:
        from dotenv import load_dotenv
        load_dotenv(config.ROOT / ".env")
    except ImportError:
        pass

    try:
        db = store.connect()
    except RuntimeError as exc:
        print(f"\n{exc}")
        return 1

    batches = store.list_batches(db)
    if not batches:
        print("No batches found.")
        return 0

    for b in batches:
        ts = b.get("createdAt", "?")
        files = b.get("files", [])
        counts = b.get("counts", {})
        bid = b.get("batchId", "?")
        items_in_batch = store._col(db).count_documents(
            {"importBatch": bid, "source": store.SOURCE_TAG})
        print(f"  {bid}  {ts}  files={len(files)}  "
              f"items_now={items_in_batch}  counts={counts}")
    return 0


# ── CLI ──────────────────────────────────────────────────────────────────────

def _parse_args():
    p = argparse.ArgumentParser(description="AOS Match importer")
    p.add_argument("--to-mongo", action="store_true",
                   help="Import Excel files into MongoDB instead of JSON")
    p.add_argument("--dry-run", action="store_true",
                   help="Preview what would change, write nothing")
    p.add_argument("--replace-series", action="store_true",
                   help="Remove DB items from each course+series that are no "
                        "longer in the Excel file (only source:aos_match docs)")
    p.add_argument("--verify", action="store_true",
                   help="Check DB counts against expected table")
    p.add_argument("--rollback", type=str, metavar="BATCH_ID",
                   help="Delete items from a specific import batch")
    p.add_argument("--list-batches", action="store_true",
                   help="Show import history")
    p.add_argument("--yes", "-y", action="store_true",
                   help="Skip interactive confirmation (for CI)")
    p.add_argument("--i-know-this-is-main", action="store_true",
                   help="Allow --yes on production-looking database names")
    return p.parse_args()


if __name__ == "__main__":
    # Load .env early for all paths
    try:
        from dotenv import load_dotenv
        load_dotenv(config.ROOT / ".env")
    except ImportError:
        pass

    args = _parse_args()

    if args.verify:
        sys.exit(run_verify())
    elif args.rollback:
        sys.exit(run_rollback(args.rollback, yes=args.yes,
                              i_know_this_is_main=args.i_know_this_is_main))
    elif args.list_batches:
        sys.exit(run_list_batches())
    elif args.to_mongo:
        sys.exit(run_to_mongo(
            dry_run=args.dry_run,
            replace_series=args.replace_series,
            yes=args.yes,
            i_know_this_is_main=args.i_know_this_is_main,
        ))
    else:
        # Original: Excel -> JSON
        run()
