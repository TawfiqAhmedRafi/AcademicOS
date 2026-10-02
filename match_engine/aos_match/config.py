"""All tunable settings live here. Change numbers here, not in the engine code."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
ITEMS_JSON = ROOT / "data" / "match_items.json"

# --------------------------------------------------------------------------
# 1. Which Excel file is what.  (filename stem -> type, course, series)
#    Add a line here when a new batch's file arrives.
# --------------------------------------------------------------------------
FILE_MAP = {
    "18":      {"type": "thesis",  "course": "ETE4200", "series": "18"},
    "19":      {"type": "thesis",  "course": "ETE4200", "series": "19"},
    "20":      {"type": "thesis",  "course": "ETE4200", "series": "20"},
    "21_2200": {"type": "project", "course": "ETE2200", "series": "21"},
    "22_2200": {"type": "project", "course": "ETE2200", "series": "22"},
    "23_2200": {"type": "project", "course": "ETE2200", "series": "23"},
    "21_3200": {"type": "project", "course": "ETE3200", "series": "21"},
    "22_3200": {"type": "project", "course": "ETE3200", "series": "22"},
}

# The UI says "ete 2200" / "ETE4100" etc.  Normalise whatever comes in.
# Thesis courses (4100 / 4200) are one searchable pool.
COURSE_ALIASES = {
    "2200": "ETE2200", "ETE2200": "ETE2200",
    "3200": "ETE3200", "ETE3200": "ETE3200",
    "4100": "ETE4200", "4200": "ETE4200", "ETE4100": "ETE4200", "ETE4200": "ETE4200",
}

# --------------------------------------------------------------------------
# 2. Scoring weights
# --------------------------------------------------------------------------
# Three text signals are blended: word TF-IDF, character TF-IDF, LSA.
W_WORD, W_CHAR, W_LSA = 0.50, 0.20, 0.30

# Project titles are "fancy" and unreliable, so they get a small weight.
# Thesis has only a title, so the title IS the main text (weight 0 here).
TITLE_WEIGHT = {"project": 0.15, "thesis": 0.0}

# Keyword coverage: "what fraction of my query words appear in this item?"
# Helps short topic searches such as "autism" or "lora".
COVERAGE_WEIGHT = {"keyword": 0.40, "idea": 0.15}

LSA_COMPONENTS = 25          # automatically lowered for small scopes
MIN_SCORE = 0.25             # results below this raw score are hidden by default

# Raw score -> percentage shown to the user (piecewise linear).
# Cut-offs were chosen from evaluate.py: precision ~1.0 at >=0.50, ~0.94 at >=0.40, ~0.7 at >=0.30.
# Re-run evaluate.py after adding your own test cases and adjust.
PCT_CURVE = [(0.00, 0), (0.25, 30), (0.40, 60), (0.55, 80), (0.75, 95), (1.00, 100)]

# Raw score -> label
BANDS = [(0.55, "Very similar"), (0.40, "Related"), (0.25, "Slightly related")]
