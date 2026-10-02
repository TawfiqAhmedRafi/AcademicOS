"""
FastAPI service.  Your Node backend calls this (server-to-server); Node does the
login/role checks and decides whether to pass includePeople=true (teachers) or not (students).

Run:  uvicorn aos_match.api:app --port 8001
Env:  MATCH_API_KEY=secret   (optional; if set, every call needs header X-Internal-Key)
      MATCH_STORE=json|mongo  (default json)
      MONGO_URI, MONGO_DB     (required when MATCH_STORE=mongo)
"""
import os
from typing import Literal, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field

from . import config, importer
from .engine import MatchEngine

# Load .env at import time so uvicorn picks up env vars
try:
    from dotenv import load_dotenv
    load_dotenv(config.ROOT / ".env")
except ImportError:
    pass

app = FastAPI(title="AOS Match", version="1.0")
_state: dict = {"engine": None, "db": None}


def _store_mode() -> str:
    return os.getenv("MATCH_STORE", "json").lower()


def _get_db():
    """Lazy Mongo connection.  Cached in _state."""
    if _state["db"] is None:
        from . import store
        _state["db"] = store.connect()
    return _state["db"]


def get_engine() -> MatchEngine:
    if _state["engine"] is None:
        mode = _store_mode()
        if mode == "mongo":
            _state["engine"] = MatchEngine.from_mongo(_get_db())
        else:
            if not config.ITEMS_JSON.exists():
                importer.run(verbose=False)
            _state["engine"] = MatchEngine.from_json()
    return _state["engine"]


def check_key(x_internal_key: Optional[str] = Header(default=None)):
    expected = os.getenv("MATCH_API_KEY")
    if expected and x_internal_key != expected:
        raise HTTPException(401, "bad key")


class SearchBody(BaseModel):
    type: Literal["project", "thesis"]
    course: Optional[str] = Field(None, description="'2200' or '3200' for projects; ignored for thesis")
    query: str = Field(..., min_length=2, max_length=4000)
    mode: Literal["auto", "keyword", "idea"] = "auto"
    topK: int = Field(10, ge=1, le=50)
    minScore: float = Field(config.MIN_SCORE, ge=0, le=1)
    series: Optional[str] = None
    domain: Optional[str] = None
    includePeople: bool = False


@app.get("/match/health")
def health():
    mode = _store_mode()
    eng = get_engine()
    result = {"ok": True, "items": len(eng.items), "store": mode}
    if mode == "mongo":
        from . import store
        result["dbItems"] = store.total_count(_get_db())
    return result


@app.get("/match/scopes", dependencies=[Depends(check_key)])
def scopes():
    return get_engine().info()


@app.post("/match/search", dependencies=[Depends(check_key)])
def search(b: SearchBody):
    try:
        return get_engine().search(
            b.type, b.course, b.query, mode=b.mode, top_k=b.topK, min_score=b.minScore,
            series=b.series, domain=b.domain, include_people=b.includePeople)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/match/similar/{item_id}", dependencies=[Depends(check_key)])
def similar(item_id: str, topK: int = Query(10, ge=1, le=50), includePeople: bool = False):
    try:
        return get_engine().similar(item_id, top_k=topK, include_people=includePeople)
    except KeyError:
        raise HTTPException(404, "unknown item")


@app.get("/match/topics", dependencies=[Depends(check_key)])
def topics(type: Literal["project", "thesis"], course: Optional[str] = None,
           k: int = Query(8, ge=2, le=20)):
    try:
        return get_engine().topics(type, course, k)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/match/reindex", dependencies=[Depends(check_key)])
def reindex():
    """Rebuild the search index.  Source depends on MATCH_STORE."""
    mode = _store_mode()
    if mode == "mongo":
        # Build new engine from Mongo, then swap atomically
        new_engine = MatchEngine.from_mongo(_get_db())
        _state["engine"] = new_engine
        return {"items": len(new_engine.items), "store": "mongo"}
    else:
        items, skipped = importer.run(verbose=False)
        _state["engine"] = MatchEngine(items)
        return {"items": len(items), "skipped": [list(s) for s in skipped]}
