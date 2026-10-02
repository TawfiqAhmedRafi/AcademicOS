#!/usr/bin/env python3
"""
Grid search calibration for matching weights against eval_cases.yaml.
"""
import sys
import itertools
from pathlib import Path
import yaml

sys.path.insert(0, str(Path(__file__).parent.parent / "match_engine"))

from aos_match import config, store  # type: ignore
from aos_match.engine import MatchEngine  # type: ignore
import numpy as np

def evaluate_weights(engine, cases, w_word, w_char, w_lsa, w_title, w_cov_keyword, w_cov_idea):
    # Temporarily override engine weights
    engine.W_main = (w_word, w_char, w_lsa)
    engine.W_title = (w_word, w_char, w_lsa)
    engine.title_weight = w_title
    
    # Override coverage
    original_cov = config.COVERAGE_WEIGHT
    config.COVERAGE_WEIGHT = {"keyword": w_cov_keyword, "idea": w_cov_idea}
    
    score = 0
    total = len(cases)
    threshold_hits = {0.8: 0, 0.7: 0, 0.6: 0, 0.5: 0}
    
    for case in cases:
        try:
            res = engine.search(case["query"], type_="project", course="2200")
            
            # Simple eval logic: did expected_ids appear in top 5?
            expected = set(case.get("expected_ids", []))
            found_top_5 = {r["id"] for r in res.get("results", [])[:5]}
            
            if expected & found_top_5:
                score += 1
                
            # Track raw score thresholds for first result
            if res.get("results"):
                top_raw = res["results"][0]["score"]
                for t in threshold_hits:
                    if top_raw >= t:
                        threshold_hits[t] += 1
                        
        except Exception:
            pass
            
    # Restore original config
    config.COVERAGE_WEIGHT = original_cov
    
    return score / total if total > 0 else 0, threshold_hits


def main():
    db = store.connect()
    print("Loading engine...")
    engine = MatchEngine.from_mongo(db)
    
    eval_path = Path(__file__).parent.parent / "match_engine" / "data" / "eval_cases.yaml"
    if not eval_path.exists():
        print("No eval_cases.yaml found. Please provide cases.")
        return
        
    with open(eval_path, "r", encoding="utf-8") as f:
        cases = yaml.safe_load(f) or []
        
    if not cases:
        print("Empty eval cases.")
        return

    # Grid search parameters
    grid_weights = [
        # (w_word, w_char, w_lsa)
        (0.40, 0.20, 0.40),
        (0.35, 0.15, 0.50),
        (0.50, 0.20, 0.30),
    ]
    grid_title = [0.15, 0.20, 0.25]
    grid_cov_kw = [0.1, 0.2]
    grid_cov_id = [0.3, 0.4]

    results = []
    print(f"Running grid search over {len(grid_weights) * len(grid_title) * len(grid_cov_kw) * len(grid_cov_id)} combinations...")
    
    for ww, wt, ckw, cid in itertools.product(grid_weights, grid_title, grid_cov_kw, grid_cov_id):
        acc, th = evaluate_weights(engine, cases, ww[0], ww[1], ww[2], wt, ckw, cid)
        results.append({
            "params": (ww, wt, ckw, cid),
            "acc": acc,
            "thresholds": th
        })
        
    results.sort(key=lambda x: -x["acc"])
    
    print("\n--- Top 5 Calibration Results ---")
    print(f"{'W_main (W, C, L)':<20} | {'W_title':<10} | {'Cov(KW, ID)':<15} | {'Accuracy'}")
    print("-" * 70)
    for r in results[:5]:
        ww, wt, ckw, cid = r["params"]
        ww_str = f"{ww[0]:.2f}, {ww[1]:.2f}, {ww[2]:.2f}"
        cov_str = f"{ckw:.2f}, {cid:.2f}"
        print(f"{ww_str:<20} | {wt:<10.2f} | {cov_str:<15} | {r['acc']:.2%}")
        
    print("\n--- Recalibration Helper (BANDS / PCT_CURVE) ---")
    best_th = results[0]["thresholds"]
    total = len(cases)
    print("Cumulative matches at raw score thresholds:")
    for t in sorted(best_th.keys(), reverse=True):
        print(f" >= {t}: {best_th[t]}/{total} cases")
        
    print("\nSuggested BANDS (Manual Update Required in config.py):")
    print("If you want more strict matching, raise the BANDS thresholds based on the distribution above.")
    print("Do NOT write config automatically.")

if __name__ == "__main__":
    main()
