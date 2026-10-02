# AOS Match — development commands
# Usage:  make test | make eval | make import | make serve
# Windows:  use `make` via Git Bash / WSL, or run the commands directly.

.PHONY: install import test eval check serve baseline clean

# ── Setup ────────────────────────────────────────────────────────────────────
install:
	pip install -r requirements.txt

# ── Import Excel → JSON ─────────────────────────────────────────────────────
import:
	python -m aos_match.importer

# ── Tests ────────────────────────────────────────────────────────────────────
test:
	python -m pytest -q tests

# ── Quality evaluation ───────────────────────────────────────────────────────
eval:
	python -m aos_match.evaluate

# ── CI quality gate (exits 1 if metrics drop) ────────────────────────────────
check:
	python -m pytest -q tests
	python -m aos_match.evaluate --check

# ── Dev server ───────────────────────────────────────────────────────────────
serve:
	uvicorn aos_match.api:app --port 8001 --reload

# ── Save current eval output as the baseline ─────────────────────────────────
baseline: test eval
	@mkdir -p docs
	python -m pytest -q tests > docs/baseline.txt 2>&1 || true
	@echo "" >> docs/baseline.txt
	@echo "===== evaluate.py output =====" >> docs/baseline.txt
	python -m aos_match.evaluate >> docs/baseline.txt 2>&1

# ── Cleanup ──────────────────────────────────────────────────────────────────
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name '*.pyc' -delete 2>/dev/null || true
