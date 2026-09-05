import Link from "next/link";
import { BookOpen, Clock, GraduationCap, CheckSquare, FileText, AlertCircle } from "lucide-react";
import { StatCard, AlertBanner } from "../Widgets";

export default function StudentView({ user }: { user: any }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 dark:text-white">
        Welcome back, <span className="text-ruet-blue dark:text-ruet-gold">{user.name}</span>
      </h1>
      
      <AlertBanner 
        title="Registration Open: Semester 3-2" 
        message="Course registration for the 22 Series is currently open. Please complete your registration and submit it to your advisor by September 10, 2026." 
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Current CGPA" value="3.84" icon={GraduationCap} trend="Based on last semester" />
        <StatCard title="Completed Credits" value="105.5" icon={BookOpen} trend="Out of 160.0" />
        <StatCard title="Pending Approvals" value="1" icon={Clock} trend="Registration pending" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/registration" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Start Course Registration</span>
              <CheckSquare size={18} className="text-slate-400" />
            </Link>
            <Link href="/dashboard/backlog-registration" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Backlog Registration</span>
              <AlertCircle size={18} className="text-amber-500" />
            </Link>
            <Link href="/dashboard/results" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">View Result Sheet</span>
              <FileText size={18} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}