import Link from "next/link";
import { Users, Database, GraduationCap, CheckSquare, Network, BarChart3 } from "lucide-react";
import { StatCard, AlertBanner } from "../Widgets";

export default function DeptHeadView({ user }: { user: any }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 dark:text-white">
        Department Head Control
      </h1>
      
      <AlertBanner 
        title="Configuration Required" 
        message="The 22 Series requires a faculty advisor assignment before the next registration window can open." 
        type="warning"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value="480" icon={Users} />
        <StatCard title="Active Series" value="4" icon={Database} />
        <StatCard title="Faculty Count" value="24" icon={GraduationCap} />
        <StatCard title="Pending Approvals" value="12" icon={CheckSquare} trend="Across all advisors" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Administrative Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/series-manager" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Open/Manage Series Registration</span>
              <Network size={18} className="text-slate-400" />
            </Link>
            <Link href="/dashboard/analytics" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Department Analytics</span>
              <BarChart3 size={18} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}