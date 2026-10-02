"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import DropdownFilter from "@/app/components/DropdownFilter";

type CrossSeriesPair = {
  score: number;
  pct: number;
  band: string;
  sharedTerms: string[];
  a: any;
  b: any;
};

export default function MatchAnalysisPage() {
  const [activeTab, setActiveTab] = useState<"insights" | "cross">("insights");
  const [scopeType, setScopeType] = useState("project");
  const [course, setCourse] = useState("2200");
  
  const [insights, setInsights] = useState<any>(null);
  const [crossPairs, setCrossPairs] = useState<CrossSeriesPair[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, [activeTab, scopeType, course]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setPage(1);
    
    try {
      if (activeTab === "insights") {
        const res = await fetch(`/api/match/insights?type=${scopeType}&course=${course}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInsights(data);
      } else {
        const res = await fetch(`/api/match/cross-series?type=${scopeType}&course=${course}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setCrossPairs(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const paginatedCross = crossPairs.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(crossPairs.length / itemsPerPage);

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
        
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Match Analysis</h1>
            <p className="text-gray-500 mt-1">Pool-level insights and cross-series similarity.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <DropdownFilter
              value={scopeType}
              onChange={(val) => setScopeType(val)}
              options={[
                { label: "Project", value: "project" },
                { label: "Thesis", value: "thesis" },
              ]}
            />
            {scopeType === "project" && (
              <DropdownFilter
                value={course}
                onChange={(val) => setCourse(val)}
                options={[
                  { label: "2200", value: "2200" },
                  { label: "3200", value: "3200" },
                ]}
              />
            )}
            <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setActiveTab("insights")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "insights" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Data Insights
              </button>
              <button
                onClick={() => setActiveTab("cross")}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === "cross" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                Cross-Series Similarity
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>
        )}
        
        {loading && (
          <div className="flex justify-center py-12"><Loader2 size={32} className="animate-spin text-blue-500" /></div>
        )}

        {!loading && activeTab === "insights" && insights && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4">Underexplored Domains (≤2 items)</h2>
                <div className="flex flex-wrap gap-2">
                  {insights.underexplored?.map((tag: string) => (
                    <span key={tag} className="px-3 py-1 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium">
                      #{tag}
                    </span>
                  ))}
                  {insights.underexplored?.length === 0 && <p className="text-gray-500">None found.</p>}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="text-xl font-bold mb-4">Rising Topics</h2>
                <p className="text-sm text-gray-500 mb-4">Topics with higher counts in the latest series vs the previous.</p>
                <div className="space-y-2">
                  {insights.risingTopics?.map((t: any) => (
                    <div key={t.topic} className="flex gap-2">
                      <span className="font-bold text-green-600">↑ Cluster {t.topic}:</span>
                      <span className="text-gray-700 dark:text-gray-300">{t.terms.join(", ")}</span>
                    </div>
                  ))}
                  {insights.risingTopics?.length === 0 && <p className="text-gray-500">None found.</p>}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-6">Series Domain Distribution</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {Object.entries(insights.seriesTags || {})
                  .sort(([s1], [s2]) => s2.localeCompare(s1)) // Sort series descending
                  .map(([series, tags]: [string, any]) => {
                    const sortedTags = Object.entries(tags).sort((a: any, b: any) => b[1] - a[1]);
                    const maxCount = Math.max(...sortedTags.map(([, c]) => c as number), 1);
                    
                    return (
                      <div key={series} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Series {series}</h3>
                          <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-md">
                            {sortedTags.length} Domains
                          </span>
                        </div>
                        
                        <div className="space-y-3">
                          {sortedTags.map(([tag, count]: any) => (
                            <div key={tag}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-2">{tag}</span>
                                <span className="text-gray-500 font-medium">{count}</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full" 
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>

          </div>
        )}

        {!loading && activeTab === "cross" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-1">Cross-Series Matches</h2>
              <p className="text-gray-500 mb-6">Found {crossPairs.length} pairs across different series with score ≥ 0.55.</p>
              
              <div className="grid gap-4">
                {paginatedCross.map((p, i) => (
                  <div key={i} className="p-5 border border-gray-100 dark:border-gray-700/50 rounded-xl hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-50 dark:border-gray-700/30 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="text-center px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{p.pct}%</div>
                          <div className="text-xs text-gray-500">{p.band}</div>
                        </div>
                        <div>
                          <Link href={`/dashboard/match-compare?a=${p.a.id}&b=${p.b.id}`} className="text-sm font-semibold text-blue-600 hover:underline">
                            View Detailed Comparison →
                          </Link>
                          <div className="flex gap-2 mt-1">
                            {p.sharedTerms.map((t) => (
                              <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-xs font-bold text-gray-400 mb-1">Series {p.a.series} ({p.a.id})</div>
                        <div className="font-semibold">{p.a.title}</div>
                        {p.a.studentName && <div className="text-sm text-gray-500 mt-1">{p.a.studentName} ({p.a.roll})</div>}
                        {p.a.members && <div className="text-sm text-gray-500 mt-1">Members: {p.a.members.join(", ")}</div>}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-400 mb-1">Series {p.b.series} ({p.b.id})</div>
                        <div className="font-semibold">{p.b.title}</div>
                        {p.b.studentName && <div className="text-sm text-gray-500 mt-1">{p.b.studentName} ({p.b.roll})</div>}
                        {p.b.members && <div className="text-sm text-gray-500 mt-1">Members: {p.b.members.join(", ")}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 disabled:opacity-50 rounded-lg font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 disabled:opacity-50 rounded-lg font-medium"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

    </div>
  );
}
