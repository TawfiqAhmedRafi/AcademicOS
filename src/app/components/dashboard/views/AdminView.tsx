import Link from "next/link";
import { Database, Users, Clock, UserCog, Activity } from "lucide-react";
import { StatCard, AlertBanner } from "../Widgets";

export default function AdminView({ user }: { user: any }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 dark:text-white">
        System Overview
      </h1>

      <AlertBanner 
        title="System Secure" 
        message="All backend services and the Similarity ML endpoints are responding normally." 
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="System Status" value="Online" icon={Activity} trend="MongoDB Connected" />
        <StatCard title="Total Users" value="512" icon={Users} />
        <StatCard title="Active Sessions" value="42" icon={Clock} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Security & Provisioning</h3>
          <div className="space-y-3">
            <Link href="/dashboard/faculty-mgmt" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Manage Faculty Members</span>
              <UserCog size={18} className="text-slate-400" />
            </Link>
            <Link href="/dashboard/logs" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">View System Logs</span>
              <Database size={18} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}