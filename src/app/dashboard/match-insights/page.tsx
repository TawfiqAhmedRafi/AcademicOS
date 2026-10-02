import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { Search, AlertCircle, MousePointerClick, BarChart3, TrendingUp, SearchX } from "lucide-react";

export const metadata = {
  title: "Match Insights | Admin",
};

export default async function MatchInsightsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "dept_head" && session.user.isAdmin !== true)) {
    redirect("/");
  }

  const db = await getDb();
  
  // 1. Top queries
  const topQueries = await db.collection("matchlogs").aggregate([
    { $match: { queryTokens: { $exists: true, $not: { $size: 0 } } } },
    { $unwind: "$queryTokens" },
    { $group: { _id: "$queryTokens", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();

  // 2. Zero-result queries
  const zeroResult = await db.collection("matchlogs").aggregate([
    { $match: { resultCount: 0 } },
    { $group: { _id: "$queryTokens", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();

  // 3. Low-click queries (results > 0 but no clicks)
  const lowClick = await db.collection("matchlogs").aggregate([
    { $match: { resultCount: { $gt: 0 }, "clicks.0": { $exists: false } } },
    { $group: { _id: "$queryTokens", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 15 }
  ]).toArray();

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Match Telemetry</h1>
          <p className="text-gray-500 mt-1">Analytics and user behavior based on 180-day search logs.</p>
        </div>
        <div className="p-4 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-2xl self-start md:self-auto">
          <BarChart3 size={32} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Top Queries Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Top Query Tokens</h2>
              <p className="text-xs text-gray-500">Most frequent search terms</p>
            </div>
          </div>
          <div className="p-2 flex-1">
            <ul className="space-y-1">
              {topQueries.map((q, i) => (
                <li key={i} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors group">
                  <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="text-gray-300 dark:text-gray-600 font-mono text-xs w-4">{i+1}.</span>
                    {q._id}
                  </span>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform">{q.count}</span>
                </li>
              ))}
              {topQueries.length === 0 && <li className="p-6 text-center text-gray-400 text-sm">No data yet.</li>}
            </ul>
          </div>
        </div>

        {/* Zero Results Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 rounded-lg">
              <SearchX size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Zero Results</h2>
              <p className="text-xs text-gray-500">Queries that found nothing</p>
            </div>
          </div>
          <div className="p-2 flex-1">
            <ul className="space-y-1">
              {zeroResult.map((q, i) => (
                <li key={i} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors group">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-4">{q._id?.join(" ") || "(empty)"}</span>
                  <span className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform shrink-0">{q.count}</span>
                </li>
              ))}
              {zeroResult.length === 0 && <li className="p-6 text-center text-gray-400 text-sm">No data yet.</li>}
            </ul>
          </div>
        </div>

        {/* Low Engagement Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 rounded-lg">
              <MousePointerClick size={20} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Low Engagement</h2>
              <p className="text-xs text-gray-500">Queries with no clicks</p>
            </div>
          </div>
          <div className="p-2 flex-1">
            <ul className="space-y-1">
              {lowClick.map((q, i) => (
                <li key={i} className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors group">
                  <span className="font-medium text-gray-700 dark:text-gray-300 truncate pr-4">{q._id?.join(" ") || "(empty)"}</span>
                  <span className="text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-400 px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform shrink-0">{q.count}</span>
                </li>
              ))}
              {lowClick.length === 0 && <li className="p-6 text-center text-gray-400 text-sm">No data yet.</li>}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
