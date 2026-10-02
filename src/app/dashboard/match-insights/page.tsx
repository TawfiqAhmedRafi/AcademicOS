import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/mongodb";
import { BarChart3, TrendingUp, SearchX, MousePointerClick } from "lucide-react";
import PaginatedInsightCard from "./PaginatedInsightCard";

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
    { $limit: 150 }
  ]).toArray();

  // 2. Zero-result queries
  const zeroResult = await db.collection("matchlogs").aggregate([
    { $match: { resultCount: 0 } },
    { $group: { _id: "$queryTokens", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 150 }
  ]).toArray();

  // 3. Low-click queries (results > 0 but no clicks)
  const lowClick = await db.collection("matchlogs").aggregate([
    { $match: { resultCount: { $gt: 0 }, "clicks.0": { $exists: false } } },
    { $group: { _id: "$queryTokens", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 150 }
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
        <PaginatedInsightCard 
          title="Top Query Tokens"
          description="Most frequent search terms"
          icon={<TrendingUp size={20} />}
          data={topQueries as any}
          colorClass="blue"
          isTokens={true}
        />

        {/* Zero Results Card */}
        <PaginatedInsightCard 
          title="Zero Results"
          description="Queries that found nothing"
          icon={<SearchX size={20} />}
          data={zeroResult as any}
          colorClass="red"
        />

        {/* Low Engagement Card */}
        <PaginatedInsightCard 
          title="Low Engagement"
          description="Queries with no clicks"
          icon={<MousePointerClick size={20} />}
          data={lowClick as any}
          colorClass="orange"
        />

      </div>
    </div>
  );
}
