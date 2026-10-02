"""
Measure search quality and suggest band cut-offs.

Each case = (type, course, query, [regexes that must ALL appear in title+description]).
"Relevant" is decided by those regexes - written by YOU, independent of the scoring code.
Add your own cases over time (especially searches that gave bad results).

Run:  python -m aos_match.evaluate
       python -m aos_match.evaluate --check                    # exit 1 if below defaults
       python -m aos_match.evaluate --check --min-pk 0.90      # custom threshold
"""
import argparse
import re
import sys

import numpy as np

from .engine import MatchEngine

# ── Default thresholds for --check (CI gate) ─────────────────────────────────
DEFAULT_MIN_PK  = 0.88
DEFAULT_MIN_R10 = 0.93
DEFAULT_MIN_MRR = 0.95

CASES = [
    ("project", "2200", "fingerprint attendance",            [r"finger|biometric", r"attend"]),
    ("project", "2200", "LoRa emergency message",            [r"lora", r"emergenc|message"]),
    ("project", "2200", "voice communication with esp32",    [r"audio|voice|speech", r"esp32|esp-32"]),
    ("project", "2200", "solar tracker",                     [r"solar|sun", r"track"]),
    ("project", "2200", "fire fighting robot",               [r"fire", r"robot|vehicle|\bcar\b"]),
    ("project", "2200", "smart parking",                     [r"parking"]),
    ("project", "2200", "gas leakage detection",             [r"gas", r"leak|detect"]),
    ("project", "2200", "agriculture rover plough seed",     [r"agri|crop|farm|plough|\bseeds?\b"]),
    ("project", "2200", "wheelchair gesture control",        [r"wheelchair"]),
    ("project", "2200", "water level monitoring",            [r"water", r"level|monitor"]),
    ("project", "3200", "blood donation platform",           [r"blood"]),
    ("project", "3200", "attendance system",                 [r"attend"]),
    ("project", "3200", "resume builder web application",    [r"resume|cv\b"]),
    ("project", "3200", "speech emotion machine learning",   [r"speech|voice", r"emotion"]),
    ("project", "3200", "alumni portal",                     [r"alumni"]),
    ("project", "3200", "e-commerce marketplace booking",    [r"marketplace|e-?commerce|booking|rental"]),
    ("thesis",  None,   "autism",                            [r"autis"]),
    ("thesis",  None,   "metamaterial absorber",             [r"metamaterial|metasurface", r"absorb"]),
    ("thesis",  None,   "rice leaf disease",                 [r"rice|leaf", r"disease"]),
    ("thesis",  None,   "patch antenna",                     [r"antenna"]),
    ("thesis",  None,   "inverter",                          [r"inverter"]),
    ("thesis",  None,   "skin lesion classification",        [r"skin|lesion|pox"]),
    ("thesis",  None,   "lung cancer detection deep learning", [r"lung"]),
    ("thesis",  None,   "solar cell perovskite",             [r"solar|perovskite|photovoltaic"]),
    ("thesis",  None,   "handwritten character recognition", [r"handwrit|character"]),
    ("thesis",  None,   "bone fracture x-ray",              [r"fracture|bone|x-ray"]),
]


def relevant_ids(engine, type_, course, regexes):
    scope = engine.resolve(type_, course)
    out = set()
    for it in scope.items:
        text = f"{it['title']} {it['description'] or ''}".lower()
        if all(re.search(r, text) for r in regexes):
            out.add(it["id"])
    return out


def main(top_k=10):
    """Run the evaluation suite.  Returns (mean_pk, mean_r10, mrr) tuple."""
    e = MatchEngine.from_json()
    P5, R10, MRR, rel_scores, nonrel_scores = [], [], [], [], []
    print(f"{'query':40s} {'#rel':>4} {'P@k':>5} {'R@10':>5}  first-miss")
    for type_, course, q, rx in CASES:
        rel = relevant_ids(e, type_, course, rx)
        res = e.search(type_, course, q, top_k=50, min_score=0.0)["results"]
        ids = [r["id"] for r in res]
        k = max(1, min(5, len(rel)))   # fair: cannot exceed #relevant
        p5 = len([i for i in ids[:k] if i in rel]) / k
        r10 = len([i for i in ids[:top_k] if i in rel]) / max(1, min(len(rel), top_k))
        rr = next((1 / (n + 1) for n, i in enumerate(ids) if i in rel), 0)
        miss = next((r["title"][:38] for r in res[:5] if r["id"] not in rel), "-")
        P5.append(p5); R10.append(r10); MRR.append(rr)
        for r in res:
            (rel_scores if r["id"] in rel else nonrel_scores).append(r["score"])
        print(f"{q[:40]:40s} {len(rel):4d} {p5:5.2f} {r10:5.2f}  {miss}")

    mean_pk  = float(np.mean(P5))
    mean_r10 = float(np.mean(R10))
    mean_mrr = float(np.mean(MRR))
    print(f"\nMean P@min(5,#rel) = {mean_pk:.2f}   Mean R@10 = {mean_r10:.2f}   MRR = {mean_mrr:.2f}")

    rel_scores, nonrel_scores = np.array(rel_scores), np.array(nonrel_scores)
    print(f"\nScore of RELEVANT items:   median {np.median(rel_scores):.2f}  "
          f"10th pct {np.percentile(rel_scores,10):.2f}  25th {np.percentile(rel_scores,25):.2f}")
    print(f"Score of NON-relevant:     median {np.median(nonrel_scores):.2f}  "
          f"75th pct {np.percentile(nonrel_scores,75):.2f}  90th {np.percentile(nonrel_scores,90):.2f}")
    print("\nPrecision if you show only items with score >= t :")
    for t in [0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]:
        a = (rel_scores >= t).sum(); b = (nonrel_scores >= t).sum()
        print(f"  t={t:.2f}  precision={a/max(1,a+b):.2f}  kept {a}/{len(rel_scores)} relevant")

    return mean_pk, mean_r10, mean_mrr


def _parse_args():
    p = argparse.ArgumentParser(description="AOS Match quality evaluation")
    p.add_argument("--check", action="store_true",
                   help="Exit with code 1 if any metric is below its threshold")
    p.add_argument("--min-pk",  type=float, default=DEFAULT_MIN_PK,
                   help=f"Min Mean P@k (default {DEFAULT_MIN_PK})")
    p.add_argument("--min-r10", type=float, default=DEFAULT_MIN_R10,
                   help=f"Min Mean R@10 (default {DEFAULT_MIN_R10})")
    p.add_argument("--min-mrr", type=float, default=DEFAULT_MIN_MRR,
                   help=f"Min MRR (default {DEFAULT_MIN_MRR})")
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    mean_pk, mean_r10, mean_mrr = main()

    if args.check:
        failures = []
        if mean_pk < args.min_pk:
            failures.append(f"P@k {mean_pk:.2f} < {args.min_pk:.2f}")
        if mean_r10 < args.min_r10:
            failures.append(f"R@10 {mean_r10:.2f} < {args.min_r10:.2f}")
        if mean_mrr < args.min_mrr:
            failures.append(f"MRR {mean_mrr:.2f} < {args.min_mrr:.2f}")
        if failures:
            print(f"\nFAIL  QUALITY GATE FAILED: {'; '.join(failures)}")
            sys.exit(1)
        print("\nPASS  QUALITY GATE PASSED")

