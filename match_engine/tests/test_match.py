import pytest
from fastapi.testclient import TestClient

from aos_match.api import app
from aos_match.engine import MatchEngine
from aos_match.text_utils import tokenize

e = MatchEngine.from_json()
client = TestClient(app)


def test_tokenizer_glues_and_maps():
    assert "esp32" in tokenize("ESP-32 based board")
    assert "esp32" in tokenize("NodeMCU")
    assert "fire" in tokenize("fire alarm robot")      # sklearn stoplist bug regression
    assert "voicecomm" in tokenize("full-duplex audio communication")


def test_scope_isolation_2200_vs_3200():
    for course in ("2200", "3200"):
        r = e.search("project", course, "attendance system", top_k=50, min_score=0)
        assert r["results"], course
        assert {x["course"] for x in r["results"]} == {f"ETE{course}"}


def test_thesis_pool_only_thesis():
    r = e.search("thesis", None, "deep learning detection", top_k=50, min_score=0)
    assert {x["type"] for x in r["results"]} == {"thesis"}


def test_known_matches():
    r = e.search("project", "2200", "fingerprint attendance")["results"]
    assert "fingerprint" in r[0]["title"].lower() or "attendance" in r[0]["title"].lower()
    r = e.search("thesis", None, "autism")["results"]
    assert len(r) >= 2 and all("autis" in x["title"].lower() for x in r[:2])


def test_unknown_words_return_empty_not_garbage():
    r = e.search("project", "3200", "quantum cryptography blockchain")
    assert r["results"] == []


def test_typo_tolerance():
    r = e.search("project", "2200", "fingerpint attendence")["results"]
    assert r and r[0]["pct"] >= 60


def test_series_filter():
    r = e.search("project", "2200", "robot", top_k=50, series="22", min_score=0)["results"]
    assert r and {x["series"] for x in r} == {"22"}


def test_people_hidden_by_default():
    r = e.search("thesis", None, "autism")["results"][0]
    assert "studentName" not in r and "roll" not in r
    r = e.search("thesis", None, "autism", include_people=True)["results"][0]
    assert r["studentName"]


def test_similar_excludes_self():
    item = next(i for i in e.items if i["type"] == "project" and i["course"] == "ETE2200")
    r = e.similar(item["id"])["results"]
    assert all(x["id"] != item["id"] for x in r)


def test_invalid_scope():
    with pytest.raises(ValueError):
        e.search("project", "4200", "anything")
    with pytest.raises(ValueError):
        e.search("project", None, "anything")


def test_api_roundtrip():
    r = client.post("/match/search", json={"type": "project", "course": "3200",
                                           "query": "blood donation website"})
    assert r.status_code == 200 and r.json()["results"]
    assert client.post("/match/search", json={"type": "project", "course": "9",
                                              "query": "abc def"}).status_code == 400
    assert client.get("/match/scopes").status_code == 200
    assert client.get("/match/similar/nope").status_code == 404


def test_evaluate_quality_gate():
    """evaluate.main() must return metrics above the CI thresholds."""
    from aos_match.evaluate import DEFAULT_MIN_PK, DEFAULT_MIN_R10, DEFAULT_MIN_MRR, main
    mean_pk, mean_r10, mean_mrr = main()
    assert mean_pk  >= DEFAULT_MIN_PK,  f"P@k {mean_pk} < {DEFAULT_MIN_PK}"
    assert mean_r10 >= DEFAULT_MIN_R10, f"R@10 {mean_r10} < {DEFAULT_MIN_R10}"
    assert mean_mrr >= DEFAULT_MIN_MRR, f"MRR {mean_mrr} < {DEFAULT_MIN_MRR}"
