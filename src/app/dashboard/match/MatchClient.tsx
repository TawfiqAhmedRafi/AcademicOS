"use client";

import { useState, useEffect, useTransition } from "react";
import { Search, Info, Loader2, Sparkles, BookOpen, Presentation, Filter, Hash, User, RefreshCcw } from "lucide-react";
import DropdownFilter from "@/app/components/DropdownFilter";
import { useToast } from "@/app/components/ToastProvider";

type UserProps = {
  id: string;
  name?: string | null;
  role?: string;
  isAdmin?: boolean;
};

// ── Types from API ────────────────────────────────────────────────────────

interface TagData {
  domain: string[];
  technique: string[];
}

interface MatchResult {
  id: string;
  type: string;
  course: string;
  series: string;
  title: string;
  description: string | null;
  score: number;
  pct: number;
  band: string;
  sharedTerms: string[];
  bestSentence: string;
  highlightSpans: [string, boolean][];
  tags: TagData;
  roll?: string;
  studentName?: string;
  members?: string[];
  memberNames?: string[];
}

interface ScopeInfo {
  type: string;
  course: string;
  count: number;
  series: string[];
  domains: string[];
}

interface TopicInfo {
  topic: number;
  terms: string[];
  size: number;
  itemIds: string[];
}

// ── Helper to render highlights safely ─────────────────────────────────────

function HighlightedText({ spans }: { spans: [string, boolean][] }) {
  if (!spans || spans.length === 0) return null;
  return (
    <span>
      {spans.map(([text, isHighlight], i) =>
        isHighlight ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 dark:text-yellow-100 rounded px-1">
            {text}
          </mark>
        ) : (
          <span key={i}>{text}</span>
        )
      )}
    </span>
  );
}

// ── Main Client Component ─────────────────────────────────────────────────

export default function MatchClient({ user }: { user: UserProps }) {
  const { showToast } = useToast();
  const [scopes, setScopes] = useState<ScopeInfo[]>([]);
  const [type, setType] = useState<"project" | "thesis" | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mode, setMode] = useState<"auto" | "keyword" | "idea">("auto");
  
  // Optional filters
  const [seriesFilter, setSeriesFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  const [results, setResults] = useState<MatchResult[]>([]);
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [logId, setLogId] = useState<string | null>(null);
  
  const [isPending, startTransition] = useTransition();
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "topics">("search");

  // Load scopes on mount
  useEffect(() => {
    fetch("/api/match/scopes")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setScopes(data);
      })
      .catch((e) => console.error("Failed to load scopes", e));
  }, []);

  // Debounce query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Execute Search
  useEffect(() => {
    if (!type || (type === "project" && !course)) {
      setResults([]);
      return;
    }
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsFetching(true);
    setError(null);

    const reqBody = {
      type,
      course,
      query: debouncedQuery,
      mode,
      series: seriesFilter || undefined,
      domain: domainFilter || undefined,
    };

    fetch("/api/match/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        startTransition(() => {
          setResults(data.results || []);
          if (data.logId) setLogId(data.logId);
        });
      })
      .catch((err) => {
        setError(err.message);
        setResults([]);
      })
      .finally(() => setIsFetching(false));
  }, [debouncedQuery, type, course, mode, seriesFilter, domainFilter]);

  // Load topics if thesis tab active
  useEffect(() => {
    if (type === "thesis" && activeTab === "topics") {
      setIsFetching(true);
      fetch("/api/match/topics?type=thesis")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setTopics(data);
        })
        .finally(() => setIsFetching(false));
    }
  }, [type, activeTab]);

  const currentScope = scopes.find((s) => s.type === type && (!course || s.course === course));

  const handleFindSimilar = (id: string) => {
    setIsFetching(true);
    setError(null);
    fetch(`/api/match/similar/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Similar search failed");
        setQuery("");
        setResults(data.results || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsFetching(false));
  };

  const handleItemClick = (id: string, rank: number) => {
    if (!logId) return;
    fetch("/api/match/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId, itemId: id, rank }),
    }).catch(console.error); // Silent track
  };

  const handleReindex = async () => {
    if (!confirm("Rebuild the search index from the database?")) return;
    try {
      const res = await fetch("/api/match/reindex", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Index rebuilt successfully! Items loaded: ${data.items}`, "success");
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    }
  };

  // ── Step 1: Type Selection ──────────────────────────────────────────────
  if (!type) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 mb-2">
            <Sparkles size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            AOS Match
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
            Discover similar academic works in our repository instantly using advanced natural language processing.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-4">
          <button
            onClick={() => setType("project")}
            className="group relative flex flex-col items-center p-8 rounded-3xl bg-white dark:bg-gray-800 border-2 border-transparent hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <Presentation size={48} className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Projects</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center">Search through ETE 2200 and 3200 course projects.</p>
          </button>
          
          <button
            onClick={() => setType("thesis")}
            className="group relative flex flex-col items-center p-8 rounded-3xl bg-white dark:bg-gray-800 border-2 border-transparent hover:border-purple-500 shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <BookOpen size={48} className="text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Thesis</h2>
            <p className="text-gray-500 dark:text-gray-400 text-center">Search the final year thesis and research repository.</p>
          </button>
        </div>
      </div>
    );
  }

  // ── Step 2: Course Selection (Projects only) ────────────────────────────
  if (type === "project" && !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-in slide-in-from-bottom-8 duration-300">
        <button onClick={() => setType(null)} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white absolute top-24 left-6 md:left-12 flex items-center">
          ← Back to selection
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Select Course</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl px-4">
          <button
            onClick={() => setCourse("2200")}
            className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md transition-all"
          >
            <span className="block text-2xl font-bold text-gray-900 dark:text-white">ETE 2200</span>
            <span className="text-sm text-gray-500">Junior Year Projects</span>
          </button>
          <button
            onClick={() => setCourse("3200")}
            className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm hover:shadow-md transition-all"
          >
            <span className="block text-2xl font-bold text-gray-900 dark:text-white">ETE 3200</span>
            <span className="text-sm text-gray-500">Senior Year Projects</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Search Interface ─────────────────────────────────────────────
  
  const handleReset = () => {
    setType(null);
    setCourse(null);
    setQuery("");
    setResults([]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={handleReset} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                ←
              </button>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {type === "project" ? (
                  <><Presentation className="text-blue-500" /> Project Search: ETE {course}</>
                ) : (
                  <><BookOpen className="text-purple-500" /> Thesis Search</>
                )}
              </h2>
            </div>
            {currentScope && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Hash size={14} /> Searching {currentScope.count} documents
              </p>
            )}
          </div>

          {(user.isAdmin || user.role === "admin" || user.role === "dept_head") && (
            <button
              onClick={handleReindex}
              className="w-full md:w-auto justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-2"
            >
              <RefreshCcw size={16} /> Rebuild Index
            </button>
          )}
        </div>

        {/* Tabs for Thesis */}
        {type === "thesis" && (
          <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab("search")}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === "search" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              Search
              {activeTab === "search" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
            </button>
            <button
              onClick={() => setActiveTab("topics")}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                activeTab === "topics" ? "text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              }`}
            >
              Browse Topics
              {activeTab === "topics" && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t-full" />}
            </button>
          </div>
        )}

        {/* Search View */}
        {activeTab === "search" && (
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                <Search size={20} />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe your idea or paste keywords..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
              {(isFetching || isPending) && (
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center text-blue-500">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-stretch md:items-center justify-between bg-gray-50 dark:bg-gray-900/30 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <div className="flex gap-2 p-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm justify-center">
                {(["auto", "keyword", "idea"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
                      mode === m
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {currentScope && (
                <div className="flex flex-wrap gap-2">
                  <DropdownFilter
                    value={seriesFilter}
                    onChange={(val) => setSeriesFilter(val)}
                    options={[
                      { label: "All Series", value: "" },
                      ...currentScope.series.map((s) => ({ label: `Series ${s}`, value: s }))
                    ]}
                  />

                  <DropdownFilter
                    value={domainFilter}
                    onChange={(val) => setDomainFilter(val)}
                    options={[
                      { label: "All Domains", value: "" },
                      ...currentScope.domains.map((d) => ({ label: d, value: d }))
                    ]}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-3">
          <Info size={20} />
          <p>{error}</p>
        </div>
      )}

      {/* Results View */}
      {activeTab === "search" && query.length >= 2 && !isFetching && !error && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <Sparkles className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                No similar matches found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Nothing similar found in {currentScope?.course || "this category"}: your idea looks original in our records.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {results.map((r, idx) => (
                <div 
                  key={r.id} 
                  onClick={() => handleItemClick(r.id, idx + 1)}
                  className="group bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                          Series {r.series}
                        </span>
                        {r.band && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            r.band === "Very similar" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            r.band === "Related" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}>
                            {r.band} ({r.pct}%)
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                        {r.title}
                      </h3>
                    </div>
                    
                    <button 
                      onClick={() => handleFindSimilar(r.id)}
                      className="shrink-0 p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:bg-gray-900/50 dark:hover:bg-blue-900/30 rounded-xl transition-colors"
                      title="Find items similar to this one"
                    >
                      <Sparkles size={18} />
                    </button>
                  </div>

                  {/* Similarity specific highlighting */}
                  {r.highlightSpans?.length > 0 && (
                    <div className="mb-4 text-sm text-gray-700 dark:text-gray-300 border-l-4 border-yellow-400 dark:border-yellow-600 pl-3 py-1 bg-yellow-50/50 dark:bg-yellow-900/10 rounded-r-lg">
                      <HighlightedText spans={r.highlightSpans} />
                    </div>
                  )}

                  {r.description && (!r.highlightSpans || r.highlightSpans.length === 0) && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {r.description}
                    </p>
                  )}

                  {/* Student Identity (only present if includePeople was true on backend) */}
                  {(r.studentName || (r.members && r.members.length > 0)) && (
                    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                      {r.studentName && (
                         <div className="flex items-center gap-1.5">
                           <User size={14} className="text-gray-400" />
                           <span className="font-medium text-gray-800 dark:text-gray-200">{r.studentName}</span>
                           {r.roll && <span className="text-gray-500">({r.roll})</span>}
                         </div>
                      )}
                      {!r.studentName && r.memberNames && r.memberNames.length > 0 && (
                         <div className="flex items-start gap-1.5">
                           <User size={14} className="text-gray-400 mt-0.5" />
                           <div className="flex flex-col">
                             {r.memberNames.map((n, i) => (
                               <span key={i} className="font-medium text-gray-800 dark:text-gray-200">
                                 {n} <span className="text-gray-500 font-normal">({r.members?.[i]})</span>
                               </span>
                             ))}
                           </div>
                         </div>
                      )}
                    </div>
                  )}

                  {/* Tags & Terms */}
                  <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-gray-100 dark:border-gray-700/50">
                    <Filter size={14} className="text-gray-400" />
                    {r.tags?.domain.map((d, i) => (
                      <span key={i} className="text-xs text-purple-600 dark:text-purple-400">#{d}</span>
                    ))}
                    {r.sharedTerms?.slice(0, 5).map((t, i) => (
                      <span key={i} className="px-2 py-1 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Topics View (Thesis only) */}
      {activeTab === "topics" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => (
            <button
              key={t.topic}
              onClick={() => {
                setActiveTab("search");
                setQuery(t.terms.join(" "));
              }}
              className="flex flex-col items-start text-left p-6 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl hover:border-purple-500 dark:hover:border-purple-400 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between w-full mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-500">Cluster {t.topic}</span>
                <span className="text-xs font-medium text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md">{t.size} items</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {t.terms.map((term, i) => (
                  <span key={i} className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {term}{i < t.terms.length - 1 ? "," : ""}
                  </span>
                ))}
              </div>
              <span className="text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity mt-auto pt-4 flex items-center gap-1">
                <Search size={12} /> Search this topic
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
