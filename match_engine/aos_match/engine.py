"""
The matching engine.  Pure scikit-learn / numpy, no neural network, no LLM, no GPU.

One ScopeIndex per search pool:
    project / ETE2200      project / ETE3200      thesis / ETE4200 (4100+4200)
so a "3200" search physically cannot return a 2200 project.

Score = blend of three cosine similarities
        word TF-IDF (1-2 grams)  +  char TF-IDF (3-5 grams)  +  LSA (truncated SVD)
then mixed with keyword coverage (what fraction of the query's words the item contains).
"""
from __future__ import annotations

import difflib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import normalize

from . import config
from .text_utils import LABELS, preprocess, split_sentences, tokenize

_WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9\-\.]*[A-Za-z0-9]|[A-Za-z0-9]")


def raw_to_pct(score: float) -> int:
    xs, ys = zip(*config.PCT_CURVE)
    return int(round(float(np.interp(score, xs, ys))))


def band_for(score: float) -> str:
    for threshold, label in config.BANDS:
        if score >= threshold:
            return label
    return "Weak"


class ScopeIndex:
    def __init__(self, items: list[dict], item_type: str):
        self.items = items
        self.type = item_type
        self.id_to_pos = {it["id"]: i for i, it in enumerate(items)}
        self.title_weight = config.TITLE_WEIGHT[item_type]

        # Main text: description for projects (titles are fancy), title for thesis.
        self.main_raw = [(it["description"] or it["title"]) for it in items]
        self.main_pp = [preprocess(t) for t in self.main_raw]
        self.title_pp = [preprocess(it["title"]) for it in items]
        corpus = self.main_pp + self.title_pp

        self.word_vec = TfidfVectorizer(
            ngram_range=(1, 2), sublinear_tf=True, token_pattern=r"\S+",
            max_df=0.6, min_df=1)
        self.word_vec.fit(corpus)
        self.char_vec = TfidfVectorizer(
            analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, max_df=0.7)
        self.char_vec.fit(corpus)

        self.W_main = self.word_vec.transform(self.main_pp)
        self.W_title = self.word_vec.transform(self.title_pp)
        self.C_main = self.char_vec.transform(self.main_pp)
        self.C_title = self.char_vec.transform(self.title_pp)

        # LSA: learns that words which co-occur (attendance, fingerprint, rfid...) are related.
        n_feat = self.W_main.shape[1]
        n = len(items)
        # fixed size while small; grows with the pool (more data supports more 'concepts')
        target = config.LSA_COMPONENTS if n <= 300 else min(100, n // 12)
        k = max(2, min(target, n - 1, n_feat - 1))
        self.svd = TruncatedSVD(n_components=k, random_state=42)
        self.svd.fit(self.word_vec.transform(corpus))
        self.L_main = normalize(self.svd.transform(self.W_main))
        self.L_title = normalize(self.svd.transform(self.W_title))

        # Keyword coverage helpers
        self.unigram_idf = {t: self.word_vec.idf_[i]
                            for t, i in self.word_vec.vocabulary_.items() if " " not in t}
        self.doc_tokens = [set(m.split()) | set(t.split())
                           for m, t in zip(self.main_pp, self.title_pp)]

        # stem -> readable surface word (for explanations)
        self.surface = self._build_surface()
        self.feature_names = self.word_vec.get_feature_names_out()

        # Phase 8: Sentence Embeddings
        self.E_main = None
        self.E_title = None
        self.embed_model = None
        if config.USE_EMBEDDINGS:
            try:
                from sentence_transformers import SentenceTransformer  # type: ignore
                self.embed_model = SentenceTransformer("all-MiniLM-L6-v2")
                self.E_main = normalize(self.embed_model.encode(self.main_raw, show_progress_bar=False))
                if self.title_weight > 0:
                    self.E_title = normalize(self.embed_model.encode([it["title"] for it in items], show_progress_bar=False))
            except ImportError:
                print("sentence-transformers not installed. Embeddings disabled.")

    # ------------------------------------------------------------------ helpers
    def _build_surface(self):
        counts = defaultdict(Counter)
        for it in self.items:
            for text in (it["title"], it["description"] or ""):
                for w in _WORD_RE.findall(text):
                    toks = tokenize(w)
                    if len(toks) == 1:
                        counts[toks[0]][w.lower()] += 1
        return {stem: c.most_common(1)[0][0] for stem, c in counts.items()}

    def label(self, feature: str) -> str:
        parts = []
        for p in feature.split(" "):
            parts.append(LABELS.get(p) or self.surface.get(p) or p)
        return " ".join(parts)

    # ------------------------------------------------------------------ scoring
    def _cos_blend(self, qw, qc, ql, Wm, Cm, Lm, qe=None, Em=None):
        sw = config.W_WORD * cosine_similarity(qw, Wm)[0]
        sc = config.W_CHAR * cosine_similarity(qc, Cm)[0]
        sl = config.W_LSA * cosine_similarity(ql, Lm)[0]
        
        if config.USE_EMBEDDINGS and qe is not None and Em is not None:
            se = config.W_EMB * cosine_similarity(qe, Em)[0]
            # normalise weights
            w_total = config.W_WORD + config.W_CHAR + config.W_LSA + config.W_EMB
            return (sw + sc + sl + se) / w_total
            
        return sw + sc + sl

    def _coverage(self, q_tokens: list[str]) -> np.ndarray:
        """IDF-weighted share of the query's words that each item contains.
        Query words that exist nowhere in this collection still count in the
        denominator (at half the mean IDF) so a half-unmatched query scores lower."""
        uniq = set(q_tokens)
        known = [t for t in uniq if t in self.unigram_idf]
        if not known:
            return np.zeros(len(self.items))
        unknown_w = 0.5 * float(np.mean(list(self.unigram_idf.values())))
        total = sum(self.unigram_idf[t] for t in known) + unknown_w * (len(uniq) - len(known))
        return np.array([sum(self.unigram_idf[t] for t in known if t in dt) / total
                         for dt in self.doc_tokens])

    def _correct_typos(self, tokens: list[str]) -> list[str]:
        """Replace unknown words with the closest word in this collection ('fingerpint' -> 'fingerprint')."""
        vocab = list(self.unigram_idf)
        fixed = []
        for t in tokens:
            if t in self.unigram_idf or len(t) < 4:
                fixed.append(t)
                continue
            m = difflib.get_close_matches(t, vocab, n=1, cutoff=0.82)
            # Prevent aggressive matching like 'weather' (7) -> 'water' (5)
            if m and abs(len(m[0]) - len(t)) <= 1:
                fixed.append(m[0])
            else:
                fixed.append(t)
        return fixed

    def score(self, query: str, mode: str):
        q_tokens = self._correct_typos(preprocess(query).split())
        q_pp = " ".join(q_tokens)
        if not any(t in self.unigram_idf for t in q_tokens):
            return None, q_pp, None, None
        qw = self.word_vec.transform([q_pp])
        qc = self.char_vec.transform([q_pp])
        ql = normalize(self.svd.transform(qw))
        
        qe = None
        if config.USE_EMBEDDINGS and getattr(self, "embed_model", None) is not None:
            qe = normalize(self.embed_model.encode([query], show_progress_bar=False))
            
        s_main = self._cos_blend(qw, qc, ql, self.W_main, self.C_main, self.L_main, qe, self.E_main)
        if self.title_weight > 0:
            s_title = self._cos_blend(qw, qc, ql, self.W_title, self.C_title, self.L_title, qe, self.E_title)
            raw = (1 - self.title_weight) * s_main + self.title_weight * s_title
        else:
            raw = s_main
        cw = config.COVERAGE_WEIGHT[mode]
        final = (1 - cw) * raw + cw * self._coverage(q_tokens)
        return np.clip(final, 0, 1), q_pp, qw, q_tokens

    # -------------------------------------------------------------- explanation
    def _shared_terms(self, qw, pos: int, n=5):
        contrib = qw.multiply(self.W_main[pos]).tocoo()
        if self.title_weight > 0:
            contrib = contrib + qw.multiply(self.W_title[pos]).tocoo() * self.title_weight
            contrib = contrib.tocoo()
        pairs = sorted(zip(contrib.col, contrib.data), key=lambda x: -x[1])
        chosen = []
        for col, _ in pairs[:12]:
            feat = self.feature_names[col]
            # skip a unigram already covered by a chosen bigram, and vice-versa
            if any((feat in c.split() or c in feat.split()) for c in chosen):
                continue
            chosen.append(feat)
            if len(chosen) == n:
                break
        return [(f, self.label(f)) for f in chosen]

    def _best_sentence(self, qw, pos: int, shared_feats: set[str]):
        item = self.items[pos]
        text = item["description"] or item["title"]
        sents = split_sentences(text) or [text]
        if len(sents) == 1:
            best = sents[0]
        else:
            M = self.word_vec.transform([preprocess(s) for s in sents])
            best = sents[int(np.argmax(cosine_similarity(qw, M)[0]))]
        stems = {p for f in shared_feats for p in f.split()}
        spans = [[m.start(), m.end()] for m in _WORD_RE.finditer(best)
                 if set(tokenize(m.group())) & stems]
        return best, spans

    # ------------------------------------------------------------------- search
    def search(self, query, mode="auto", top_k=10, min_score=config.MIN_SCORE,
               series=None, domain=None, exclude_id=None, include_people=False, members=None):
        q_tokens = tokenize(query)
        if mode == "auto":
            mode = "keyword" if len(q_tokens) <= 4 else "idea"
        scores, q_pp, qw, _ = self.score(query, mode)
        if scores is None:
            from .text_utils import has_bangla_script
            note = "None of the words in your query appear in this collection."
            if has_bangla_script(query):
                note = "Please search using English. We do not support Bangla script searches."
            return {"mode": mode, "results": [], "note": note}

        exclude_members = set(members) if members else set()
        order = np.argsort(-scores)
        results = []
        for pos in order:
            s = float(scores[pos])
            if s < min_score:
                break
            it = self.items[pos]
            if exclude_id and it["id"] == exclude_id:
                continue
            if exclude_members:
                item_members = set(it.get("members", []))
                if it.get("roll"):
                    item_members.add(it["roll"])
                if exclude_members & item_members:
                    continue
            if series and it["series"] != str(series):
                continue
            if domain and domain not in it["tags"]["domain"]:
                continue
            shared = self._shared_terms(qw, pos)
            sentence, spans = self._best_sentence(qw, pos, {f for f, _ in shared})
            results.append(self._format(it, s, shared, sentence, spans, include_people))
            if len(results) >= top_k:
                break
        return {"mode": mode, "results": results}

    def _format(self, it, s, shared, sentence, spans, include_people):
        # Convert index spans to text chunks for frontend: [ [text, is_highlight], ... ]
        chunks = []
        last_idx = 0
        for start, end in spans:
            if start > last_idx:
                chunks.append([sentence[last_idx:start], False])
            chunks.append([sentence[start:end], True])
            last_idx = end
        if last_idx < len(sentence):
            chunks.append([sentence[last_idx:], False])
            
        out = {
            "id": it["id"], "type": it["type"], "course": it["course"], "series": it["series"],
            "title": it["title"], "description": it["description"],
            "score": round(s, 4), "pct": raw_to_pct(s), "band": band_for(s),
            "sharedTerms": [lab for _, lab in shared],
            "bestSentence": sentence, "highlightSpans": chunks, "tags": it["tags"],
        }
        if include_people:
            out.update({"roll": it["roll"], "members": it.get("members", []),
                        "studentName": it.get("studentName"),
                        "memberNames": it.get("memberNames", [])})
        return out

    def topics(self, k=8, top_terms=6):
        k = max(2, min(k, len(self.items) // 3))
        km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(self.L_main)
        out = []
        for c in range(k):
            idx = np.where(km.labels_ == c)[0]
            centroid = np.asarray(self.W_main[idx].mean(axis=0)).ravel()
            # unigrams only, they read better as topic names
            cols = [j for j in np.argsort(-centroid) if " " not in self.feature_names[j]][:top_terms]
            out.append({"topic": c + 1,
                        "terms": [self.label(self.feature_names[j]) for j in cols],
                        "size": int(len(idx)),
                        "itemIds": [self.items[i]["id"] for i in idx]})
        return sorted(out, key=lambda t: -t["size"])

    def insights(self):
        from collections import defaultdict, Counter
        series_tags = defaultdict(lambda: defaultdict(int))
        global_tags = Counter()
        for it in self.items:
            s = it["series"]
            for dom in it["tags"]["domain"]:
                series_tags[s][dom] += 1
                global_tags[dom] += 1
                
        topics = self.topics(k=8)
        series_topics = defaultdict(lambda: defaultdict(int))
        for t in topics:
            for item_id in t["itemIds"]:
                s = self.items[self.id_to_pos[item_id]]["series"]
                series_topics[s][t["topic"]] += 1
                
        underexplored = [tag for tag, count in global_tags.items() if count <= 2]
        
        sorted_series = sorted(series_tags.keys())
        rising_topics = []
        if len(sorted_series) >= 2:
            newest, older = sorted_series[-1], sorted_series[-2]
            for t in topics:
                t_id = t["topic"]
                if series_topics[newest][t_id] > series_topics[older][t_id]:
                    rising_topics.append({"topic": t_id, "terms": t["terms"]})

        return {
            "seriesTags": {k: dict(v) for k, v in series_tags.items()},
            "seriesTopics": {k: dict(v) for k, v in series_topics.items()},
            "underexplored": underexplored,
            "risingTopics": rising_topics,
            "topics": topics
        }

    def cross_series(self, include_people=False):
        # Pairs with score >= 0.55 between DIFFERENT series in the same pool
        # This is a heavy computation, so it should be cached by the caller.
        pairs = []
        for i, it_a in enumerate(self.items):
            text_a = it_a["description"] or it_a["title"]
            scores, _, qw, _ = self.score(text_a, mode="idea")
            if scores is None:
                continue
            for j in range(i + 1, len(self.items)):
                it_b = self.items[j]
                if it_a["series"] == it_b["series"]:
                    continue
                s = float(scores[j])
                if s >= 0.55:
                    shared = self._shared_terms(qw, j)
                    out_a = {"id": it_a["id"], "title": it_a["title"], "series": it_a["series"]}
                    out_b = {"id": it_b["id"], "title": it_b["title"], "series": it_b["series"]}
                    if include_people:
                        out_a.update({"roll": it_a.get("roll"), "members": it_a.get("members")})
                        out_b.update({"roll": it_b.get("roll"), "members": it_b.get("members")})
                    pairs.append({
                        "score": round(s, 4), "pct": raw_to_pct(s), "band": band_for(s),
                        "sharedTerms": [lab for _, lab in shared],
                        "a": out_a, "b": out_b
                    })
        pairs.sort(key=lambda x: -x["score"])
        return pairs


class MatchEngine:
    """Holds every ScopeIndex.  Build once at startup, rebuild after an import."""

    def __init__(self, items: list[dict]):
        self.items = items
        self.by_id = {it["id"]: it for it in items}
        groups = defaultdict(list)
        for it in items:
            groups[(it["type"], it["course"])].append(it)
        self.scopes = {k: ScopeIndex(v, k[0]) for k, v in groups.items()}

    @classmethod
    def from_json(cls, path: Path = config.ITEMS_JSON):
        return cls(json.loads(Path(path).read_text(encoding="utf-8")))

    @classmethod
    def from_mongo(cls, db=None):
        """Build engine from MongoDB.  If db is None, connects using env vars."""
        from . import store
        from .text_utils import configure_vocab
        if db is None:
            db = store.connect()
            
        # 1. Load and inject dynamic vocabulary before preprocessing items
        vocab = store.load_vocab(db)
        configure_vocab(vocab)
        
        # 2. Load items and build
        items = store.load_all(db)
        if not items:
            raise RuntimeError("No items in MongoDB.  Run the importer first: "
                               "python -m aos_match.importer --to-mongo")
        return cls(items)

    # -- scope resolution -----------------------------------------------------
    def resolve(self, type_: str, course: str | None) -> ScopeIndex:
        type_ = (type_ or "").lower()
        if type_ == "thesis":
            key = ("thesis", "ETE4200")  # 4100 and 4200 are one pool
        elif type_ == "project":
            c = config.COURSE_ALIASES.get(str(course or "").upper().replace(" ", ""))
            if c not in ("ETE2200", "ETE3200"):
                raise ValueError("For projects, course must be 2200 or 3200.")
            key = ("project", c)
        else:
            raise ValueError("type must be 'project' or 'thesis'.")
        if key not in self.scopes:
            raise ValueError(f"No data loaded for {key}.")
        return self.scopes[key]

    def search(self, type_, course, query, **kw):
        if not query or not query.strip():
            raise ValueError("query is empty")
        return self.resolve(type_, course).search(query, **kw)

    def similar(self, item_id, top_k=10, include_people=False, **kw):
        it = self.by_id.get(item_id)
        if not it:
            raise KeyError(item_id)
        scope = self.resolve(it["type"], it["course"])
        text = it["description"] or it["title"]
        return scope.search(text, mode="idea", top_k=top_k, exclude_id=item_id,
                            include_people=include_people, **kw)

    def compare(self, id_a: str, id_b: str):
        it_a = self.by_id.get(id_a)
        it_b = self.by_id.get(id_b)
        if not it_a or not it_b:
            raise KeyError("item not found")
        if (it_a["type"], it_a["course"]) != (it_b["type"], it_b["course"]):
            raise ValueError("Cannot compare items from different scopes")
            
        scope = self.resolve(it_a["type"], it_a["course"])
        pos_b = scope.id_to_pos[id_b]
        
        text_a = it_a["description"] or it_a["title"]
        text_b = it_b["description"] or it_b["title"]
        
        scores, _, qw, _ = scope.score(text_a, mode="idea")
        s = float(scores[pos_b])
        shared = scope._shared_terms(qw, pos_b, n=15)
        
        stems = {p for f, _ in shared for p in f.split()}
        def get_spans(text):
            return [[m.start(), m.end()] for m in _WORD_RE.finditer(text)
                    if set(tokenize(m.group())) & stems]
                    
        return {
            "score": round(s, 4), "pct": raw_to_pct(s), "band": band_for(s),
            "sharedTerms": [lab for _, lab in shared],
            "a": {"id": id_a, "title": it_a["title"], "text": text_a, "spans": get_spans(text_a)},
            "b": {"id": id_b, "title": it_b["title"], "text": text_b, "spans": get_spans(text_b)},
        }

    def info(self):
        out = []
        for (t, c), sc in sorted(self.scopes.items()):
            out.append({
                "type": t, "course": c, "count": len(sc.items),
                "series": sorted({i["series"] for i in sc.items}),
                "domains": sorted({d for i in sc.items for d in i["tags"]["domain"]}),
            })
        return out
        
    def insights(self, type_: str, course: str | None = None):
        return self.resolve(type_, course).insights()
        
    def cross_series(self, type_: str, course: str | None = None, include_people=False):
        return self.resolve(type_, course).cross_series(include_people=include_people)

    def topics(self, type_, course, k=8):
        return self.resolve(type_, course).topics(k)
