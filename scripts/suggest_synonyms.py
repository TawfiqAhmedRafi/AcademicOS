#!/usr/bin/env python3
"""
Suggest vocabulary additions (synonyms) based on zero-result queries.
It looks at the `matchlogs` collection, extracts zero-result query tokens,
and uses difflib + LSA (via the existing MatchEngine) to find nearest known terms.

Usage:
  python -m scripts.suggest_synonyms

Does NOT apply them automatically. Outputs suggestions for a human to review.
"""
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent / "match_engine"))

from aos_match import store  # type: ignore
from aos_match.engine import MatchEngine  # type: ignore
import difflib

def main():
    db = store.connect()
    
    # 1. Fetch zero-result queries from the last 30 days
    zero_logs = db[store.COL_LOGS].find({"resultCount": 0})
    zero_tokens = set()
    for log in zero_logs:
        for t in log.get("queryTokens", []):
            if len(t) > 3:  # ignore very short tokens
                zero_tokens.add(t)

    if not zero_tokens:
        print("No zero-result query tokens found.")
        return

    # 2. Load engine to get known vocabulary from the vectorizer
    print("Loading search engine to analyze vocabulary...")
    try:
        engine = MatchEngine.from_mongo(db)
    except Exception as e:
        print(f"Failed to load engine: {e}")
        return

    # Extract all known terms from the 2200 project pool (or 4200)
    # We just need the LSA features to see what the engine "knows"
    # To keep it simple, we use the vectorizer's vocabulary keys
    known_terms = set()
    for scope in engine.scopes.values():
        known_terms.update(scope.word_vec.vocabulary_.keys())

    # 3. Find suggestions
    suggestions = []
    
    for token in zero_tokens:
        if token in known_terms:
            continue  # The engine actually knows it, zero results were due to context
            
        # Approach: Difflib for spelling mistakes
        closest = difflib.get_close_matches(token, known_terms, n=2, cutoff=0.8)
        if closest:
            suggestions.append({
                "token": token,
                "matches": closest,
                "reason": "Spelling similarity"
            })
            
    # 4. Output for human review
    if not suggestions:
        print("\nNo obvious synonym suggestions found.")
        return
        
    print("\n--- SYNONYM SUGGESTIONS FOR ZERO-RESULT QUERIES ---\n")
    print("These search terms returned 0 results, but look very similar to known terms:")
    for s in suggestions:
        print(f"Unknown term: '{s['token']}'")
        print(f"  -> Suggestion: Map to {s['matches']}")
        print(f"  -> Action: Add a 'synonym' rule from '{s['token']}' to '{s['matches'][0]}'\n")

if __name__ == "__main__":
    main()
