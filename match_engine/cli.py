"""Try it from the terminal:   python cli.py project 2200 "fingerprint attendance"
                               python cli.py thesis - "autism" """
import sys
from aos_match.engine import MatchEngine

if len(sys.argv) < 4:
    sys.exit(__doc__)
type_, course, query = sys.argv[1], sys.argv[2], " ".join(sys.argv[3:])
e = MatchEngine.from_json()
r = e.search(type_, None if course == "-" else course, query, include_people=True)
print(f"mode={r['mode']}  {r.get('note','')}")
for x in r["results"]:
    who = x.get("studentName") or ", ".join(x.get("members", []))
    print(f"\n{x['pct']:3d}%  {x['band']:16s} {x['course']} s{x['series']}  {who}")
    print(f"      {x['title']}")
    print(f"      shared: {', '.join(x['sharedTerms'])}")
