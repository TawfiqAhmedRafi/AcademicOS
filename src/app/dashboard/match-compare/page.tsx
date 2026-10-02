"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Navbar from "@/app/components/Navbar";

type CompareResult = {
  score: number;
  pct: number;
  band: string;
  sharedTerms: string[];
  a: { id: string; title: string; text: string; spans: [number, number][] };
  b: { id: string; title: string; text: string; spans: [number, number][] };
};

// Safe highlight component for text
function HighlightedText({ text, spans }: { text: string; spans: [number, number][] }) {
  if (!spans || spans.length === 0) return <span>{text}</span>;

  const elements = [];
  let lastIndex = 0;
  
  // Sort spans just in case, though they should be sequential
  const sortedSpans = [...spans].sort((x, y) => x[0] - y[0]);

  sortedSpans.forEach(([start, end], i) => {
    if (start > lastIndex) {
      elements.push(<span key={`t-${i}`}>{text.substring(lastIndex, start)}</span>);
    }
    elements.push(
      <mark key={`m-${i}`} className="bg-yellow-200 dark:bg-yellow-900/60 dark:text-yellow-100 rounded px-1">
        {text.substring(start, end)}
      </mark>
    );
    lastIndex = end;
  });

  if (lastIndex < text.length) {
    elements.push(<span key="t-end">{text.substring(lastIndex)}</span>);
  }

  return <>{elements}</>;
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const initialAId = searchParams.get("a") || "";
  const initialBId = searchParams.get("b") || "";

  const [aId, setAId] = useState(initialAId);
  const [bId, setBId] = useState(initialBId);
  
  const [data, setData] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialAId && initialBId) {
      handleCompare(initialAId, initialBId);
    }
  }, [initialAId, initialBId]);

  const handleCompare = (a: string, b: string) => {
    if (!a || !b) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(`/api/match/compare?a=${a}&b=${b}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to compare");
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
        
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compare Submissions</h1>
            <p className="text-gray-500 mt-1">Side-by-side plagiarism and similarity analysis.</p>
          </div>
          <button onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        {!data && !loading && !error && (
          <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"></path><path d="M8 3H3v5"></path><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.828l-5.656-5.656A4 4 0 0 1 4 2.343V2h20v.343a4 4 0 0 1-1.172 2.829l-5.656 5.656A4 4 0 0 0 16 13.7V22"></path></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Submissions Selected</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              To compare submissions, click the "Compare" link from a search result or from the Cross-Series Similarity report in the Match Analysis tab.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center p-12 text-blue-500">
            <Loader2 size={32} className="animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Similarity Score: {data.pct}%</h3>
                <p className="text-sm text-gray-500">Raw cosine score: {data.score}</p>
              </div>
              <div className={`px-4 py-2 font-bold rounded-xl ${
                data.band === "Very similar" ? "bg-red-100 text-red-700" :
                data.band === "Related" ? "bg-orange-100 text-orange-700" :
                "bg-blue-100 text-blue-700"
              }`}>
                {data.band}
              </div>
            </div>

            {data.sharedTerms?.length > 0 && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Shared Vocabulary Match</h3>
                <div className="flex flex-wrap gap-2">
                  {data.sharedTerms.map((t, i) => (
                    <span key={i} className="px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[data.a, data.b].map((item, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Document {idx === 0 ? "A" : "B"} ({item.id})</span>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-2 mb-4 leading-tight">
                    {item.title}
                  </h2>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    <HighlightedText text={item.text} spans={item.spans} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

    </div>
  );
}
