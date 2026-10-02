import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import Navbar from "@/app/components/Navbar";

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
    { $limit: 20 }
  ]).toArray();

  // 2. Zero-result queries
  const zeroResult = await db.collection("matchlogs").aggregate([
    { $match: { resultCount: 0 } },
    { $group: { _id: "$queryTokens", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();

  // 3. Low-click queries (results > 0 but no clicks)
  const lowClick = await db.collection("matchlogs").aggregate([
    { $match: { resultCount: { $gt: 0 }, "clicks.0": { $exists: false } } },
    { $group: { _id: "$queryTokens", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Match Telemetry</h1>
        <p className="text-gray-500">Analytics based on 180-day search logs.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">Top Query Tokens</h2>
            <ul className="space-y-2">
              {topQueries.map((q, i) => (
                <li key={i} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700 pb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{q._id}</span>
                  <span className="text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{q.count}</span>
                </li>
              ))}
              {topQueries.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">Zero Results</h2>
            <ul className="space-y-2">
              {zeroResult.map((q, i) => (
                <li key={i} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700 pb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{q._id?.join(" ")}</span>
                  <span className="text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{q.count}</span>
                </li>
              ))}
              {zeroResult.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">Low Engagement (No clicks)</h2>
            <ul className="space-y-2">
              {lowClick.map((q, i) => (
                <li key={i} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-gray-700 pb-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{q._id?.join(" ")}</span>
                  <span className="text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{q.count}</span>
                </li>
              ))}
              {lowClick.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
            </ul>
          </div>

        </div>
    </div>
  );
}
