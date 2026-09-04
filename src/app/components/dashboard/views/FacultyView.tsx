import Link from "next/link";
import { BookOpen, FileText, ShieldAlert, Calendar, UploadCloud, CheckCircle } from "lucide-react";
import { StatCard, AlertBanner } from "../Widgets";

export default function FacultyView({ user }: { user: any }) {

  const isAdvisor = !!user.advising_series;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 dark:text-white">
        Faculty Portal
      </h1>
      {isAdvisor && (
        <AlertBanner 
          title={`Advisor Access Unlocked: Series ${user.advising_series}`}
          message="Use the Advisor Tools in your sidebar to manage your advisee rosters and pending approvals."
          type="info"
        />
      )}

      <AlertBanner 
        title="Pending Marks Submission" 
        message="CT-2 marks for ETE 3211 are due by the end of the week. Please upload the formatted XLSX file." 
        type="warning"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Active Courses" value="3" icon={BookOpen} trend="Semester 3-2 & 4-1" />
        <StatCard title="Pending Marks" value="2" icon={FileText} trend="Awaiting upload" />
        <StatCard title="Similarity Flags" value="0" icon={ShieldAlert} trend="All clear" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/marks" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Upload Marks (XLSX)</span>
              <UploadCloud size={18} className="text-slate-400" />
            </Link>
            <Link href="/dashboard/similarity" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Review Similarity Queue</span>
              <CheckCircle size={18} className="text-slate-400" />
            </Link>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Today&apos;s Schedule</h3>
          <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-white/5 dark:bg-white/5">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
              <Calendar size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white">ETE 3211 - Fiber Optic Comm.</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400">10:00 AM • Room 402</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}