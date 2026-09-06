"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Clock, GraduationCap, CheckSquare, FileText, AlertCircle, Calendar, MapPin, Loader2, CheckCircle, ShieldAlert, Bell } from "lucide-react";
import { StatCard, AlertBanner } from "../Widgets";

const TIME_PERIODS: Record<number, { start: string, end: string }> = {
  1: { start: "8:00", end: "8:50" },
  2: { start: "8:50", end: "9:40" },
  3: { start: "9:40", end: "10:30" },
  4: { start: "10:50", end: "11:40" },
  5: { start: "11:40", end: "12:30" },
  6: { start: "12:30", end: "1:20" },
  7: { start: "2:30", end: "3:20" },
  8: { start: "3:20", end: "4:10" },
  9: { start: "4:10", end: "5:00" },
};

export default function StudentView({ user }: { user: any }) {
  const [stats, setStats] = useState({
    cgpa: 0,
    earnedCredits: 0,
    activeBacklogs: 0,
    todaysClasses: [] as any[],
    regStatus: "unregistered",
    ffStatus: "unregistered",
    backlogStatus: "unregistered",
    seriesConfig: null as any,
    activeNotices: [] as any[], 
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [resultsRes, routineRes, regRes, ffRes, backlogRes, noticesRes] = await Promise.all([
          fetch('/api/student/results'),
          fetch('/api/student/routine'),
          fetch('/api/student/registration'),
          fetch('/api/student/form-fillup'),
          fetch('/api/student/backlog-registration'),
          fetch('/api/notices') 
        ]);

        let cgpa = 0;
        let earnedCredits = 0;
        let activeBacklogs = 0;
        let todaysClasses: any[] = [];
        let regStatus = "unregistered";
        let ffStatus = "unregistered";
        let backlogStatus = "unregistered";
        let seriesConfig = null;

        if (resultsRes.ok) {
          const resData = await resultsRes.json();
          cgpa = resData.cgpa || 0;
          activeBacklogs = resData.activeBacklogs?.length || 0;
          earnedCredits = (resData.academicHistory || []).reduce((sum: number, hist: any) => sum + (hist.earnedCredits || 0), 0);
        }

        if (routineRes.ok) {
          const routData = await routineRes.json();
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const today = days[new Date().getDay()];
          if (routData.slots) {
            todaysClasses = routData.slots
              .filter((s: any) => s.day === today)
              .sort((a: any, b: any) => a.startPeriod - b.startPeriod);
          }
        }

        if (regRes.ok) {
          const regData = await regRes.json();
          regStatus = regData.status;
          seriesConfig = regData.seriesConfig; 
        }

        if (ffRes.ok) {
          const ffData = await ffRes.json();
          ffStatus = ffData.formFillupStatus;
        }

        if (backlogRes.ok) {
          const backlogData = await backlogRes.json();
          backlogStatus = backlogData.status;
        }

        // Process Notices specifically for this student
        let activeNotices: any[] = [];
        if (noticesRes.ok && seriesConfig) {
           const allNotices = await noticesRes.json();
           activeNotices = allNotices.filter((n: any) => n.series === "all" || String(n.series) === String(seriesConfig.series));
        }

        setStats({ cgpa, earnedCredits, activeBacklogs, todaysClasses, regStatus, ffStatus, backlogStatus, seriesConfig, activeNotices });
      } catch (error) {
        console.error("Failed to fetch student dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center animate-in fade-in">
        <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
      </div>
    );
  }

  const pendingCount = [stats.regStatus, stats.ffStatus, stats.backlogStatus].filter(s => s === "pending").length;
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  // --- MULTI-HEADLINE TICKER LOGIC ---
  // Grab the Top 3 most recent notices applicable to this student
  const recentNotices = stats.activeNotices?.slice(0, 3) || [];
  
  // To ensure the CSS seamless loop never breaks (even on ultrawide monitors),
  // we dynamically repeat the top notices until we have a continuous chain of at least 4 items.
  const tickerItems = recentNotices.length > 0 
    ? Array.from({ length: Math.max(4, recentNotices.length * 2) }).map((_, i) => recentNotices[i % recentNotices.length])
    : [];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h1 className="mb-6 text-3xl font-extrabold text-slate-900 dark:text-white">
        Welcome back, <span className="text-ruet-blue dark:text-ruet-gold">{user.name}</span>
      </h1>

      {/* --- PREMIUM DYNAMIC MULTI-HEADLINE MARQUEE --- */}
      {tickerItems.length > 0 && (
        <div className="mb-8 relative flex w-full items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-[#0f172a] dark:ring-white/10">
          {/* Static Left Badge */}
          <div className="relative z-10 flex items-center gap-2 bg-ruet-blue px-5 py-3.5 font-bold text-white shadow-[10px_0_15px_-3px_rgba(0,0,0,0.1)] dark:bg-ruet-gold dark:text-black">
            <Bell size={18} className="animate-pulse" />
            <span className="hidden sm:inline uppercase tracking-widest text-xs">Latest Notices</span>
          </div>
          
          {/* Seamless Scrolling Content */}
          <div className="marquee-container bg-slate-50/50 dark:bg-white/5 py-3.5">
            {/* Track 1 */}
            <div className="animate-marquee hover:[animation-play-state:paused]">
              {tickerItems.map((n: any, idx: number) => (
                <div key={`t1-${idx}`} className="flex items-center gap-2 px-6">
                  <span className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${n.type === 'system' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : n.series === 'all' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold'}`}>
                    {n.type === 'system' ? 'System' : n.series === 'all' ? 'Global' : 'Notice'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{n.title}:</span>
                  <span className="text-slate-600 dark:text-slate-400">{n.content}</span>
                  <span className="ml-6 text-slate-300 dark:text-slate-700">|</span>
                </div>
              ))}
            </div>
            {/* Track 2 (Identical Clone for seamless loop) */}
            <div className="animate-marquee hover:[animation-play-state:paused]" aria-hidden="true">
              {tickerItems.map((n: any, idx: number) => (
                <div key={`t2-${idx}`} className="flex items-center gap-2 px-6">
                  <span className={`rounded px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${n.type === 'system' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : n.series === 'all' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : 'bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold'}`}>
                    {n.type === 'system' ? 'System' : n.series === 'all' ? 'Global' : 'Notice'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{n.title}:</span>
                  <span className="text-slate-600 dark:text-slate-400">{n.content}</span>
                  <span className="ml-6 text-slate-300 dark:text-slate-700">|</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC ALERTS BASED ON GLOBAL GATES */}
      {stats.activeBacklogs > 0 && stats.seriesConfig?.backlogRegistration?.isOpen && stats.backlogStatus === "unregistered" && (
        <AlertBanner 
          title="Backlog Registration Open" 
          message="You have uncleared backlogs and the registration portal is currently open. Please register for your exams immediately." 
          type="warning" 
        />
      )}
      {stats.seriesConfig?.registration?.isOpen && stats.regStatus === "unregistered" && (
        <AlertBanner 
          title={`Registration Open: Semester ${stats.seriesConfig.currentSemester}`} 
          message="Course registration is currently open for your series. Please complete your registration and submit it to your Course Advisor." 
        />
      )}
      {stats.seriesConfig?.formFillup?.isOpen && stats.ffStatus === "unregistered" && stats.regStatus === "approved" && (
        <AlertBanner 
          title="Exam Form Fill-up Open" 
          message="The semester final form fill-up portal is now open. Verify your courses and submit your form." 
        />
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Cumulative GPA" value={stats.cgpa.toFixed(2)} icon={GraduationCap} trend="Official Record" />
        <StatCard title="Earned Credits" value={stats.earnedCredits.toFixed(2)} icon={BookOpen} trend="Total Cleared" />
        <StatCard title="Pending Approvals" value={pendingCount.toString()} icon={Clock} trend={pendingCount > 0 ? "Awaiting Advisor" : "All clear"} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/registration" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 shadow-sm border border-slate-200 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Course Registration</span>
              <CheckSquare size={18} className={stats.regStatus === "approved" ? "text-emerald-500" : "text-slate-400"} />
            </Link>
            <Link href="/dashboard/form-fillup" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 shadow-sm border border-slate-200 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Exam Form Fill-up</span>
              <FileText size={18} className={stats.ffStatus === "approved" ? "text-emerald-500" : "text-slate-400"} />
            </Link>
            {stats.activeBacklogs > 0 && (
              <Link href="/dashboard/backlog-registration" className="flex w-full items-center justify-between rounded-xl bg-amber-50 p-4 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 shadow-sm border border-amber-200 dark:border-amber-500/20">
                <span className="font-semibold text-amber-800 dark:text-amber-200">Backlog Registration</span>
                <ShieldAlert size={18} className="text-amber-500" />
              </Link>
            )}
            <Link href="/dashboard/routine" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 shadow-sm border border-slate-200 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Full Class Routine</span>
              <Calendar size={18} className="text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Dynamic Today's Schedule */}
        <div className="glass-panel rounded-3xl p-6 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Today's Schedule</h3>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{todayStr}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
            {stats.todaysClasses.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-8 text-center opacity-70">
                <CheckCircle className="mb-2 text-emerald-500" size={32} />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No classes scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.todaysClasses.map((slot, idx) => {
                  const time = TIME_PERIODS[slot.startPeriod];
                  return (
                    <div key={idx} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/50 p-4 dark:border-white/5 dark:bg-white/5 shadow-sm">
                      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                        <span className="text-xs font-black">P{slot.startPeriod}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {slot.courseCode}
                          <span className="text-[9px] uppercase tracking-wider bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                            {slot.type}
                          </span>
                        </h4>
                        <div className="mt-1 flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><Clock size={12} /> {time?.start}</span>
                          {slot.room && slot.room !== "N/A" && (
                            <span className="flex items-center gap-1"><MapPin size={12} /> {slot.room}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}