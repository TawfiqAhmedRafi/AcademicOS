"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, FileText, ShieldAlert, Calendar, UploadCloud, CheckCircle, Loader2, Clock, MapPin } from "lucide-react";
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

export default function FacultyView({ user }: { user: any }) {
  const isAdvisor = !!user.advising_series;
  
  const [stats, setStats] = useState({
    activeCourses: 0,
    pendingMarks: 0,
    todaysClasses: [] as any[],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [classesRes, marksRes] = await Promise.all([
          fetch('/api/faculty/my-classes'),
          fetch('/api/faculty/marks-dashboard')
        ]);

        let todaysClasses: any[] = [];
        let activeCoursesCount = 0;
        let pendingMarksCount = 0;

        // 1. Process Routine Data
        if (classesRes.ok) {
          const classData = await classesRes.json();
          const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
          const today = days[new Date().getDay()];

          if (classData.slots) {
            activeCoursesCount = new Set(classData.slots.map((s: any) => s.courseCode)).size;
            
            // Filter classes for today and sort by period
            todaysClasses = classData.slots
              .filter((s: any) => s.day === today)
              .sort((a: any, b: any) => a.startPeriod - b.startPeriod);
          }
        }

        // 2. Process Marks Data
        if (marksRes.ok) {
          const marksData = await marksRes.json();
          if (marksData.courses) {
            marksData.courses.forEach((c: any) => {
              // Determine expected segments based on course type
              let expectedSegments = 0;
              if (c.type === 'theory') expectedSegments = 4;
              else if (c.type === 'sessional') expectedSegments = 7;
              else if (c.type === 'special') expectedSegments = 4;

              const completed = c.completedSegments?.length || 0;
              if (completed < expectedSegments) {
                pendingMarksCount += (expectedSegments - completed);
              }
            });
          }
        }

        setStats({ activeCourses: activeCoursesCount, pendingMarks: pendingMarksCount, todaysClasses });
      } catch (error) {
        console.error("Failed to fetch faculty dashboard data:", error);
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

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 dark:text-white">
        Faculty Portal
      </h1>

      {isAdvisor && (
        <AlertBanner
          title={`Advisor Access: Series ${user.advising_series}`}
          message="Use the Advisor Tools in your sidebar to manage your advisee rosters, form fill-ups, and compile drafts."
          type="info"
        />
      )}

      {stats.pendingMarks > 0 ? (
        <AlertBanner
           title="Pending Marks Submission"
           message={`You have ${stats.pendingMarks} incomplete marking segments across your assigned courses. Please navigate to the Marks Upload portal to clear them.`}
           type="warning"
        />
      ) : (
        <AlertBanner
           title="All Marks Uploaded"
           message="You are completely caught up on your grading and marks submission for the active semester."
           type="info"
        />
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Active Courses" value={stats.activeCourses.toString()} icon={BookOpen} trend="Allocated to you" />
        <StatCard title="Pending Mark Uploads" value={stats.pendingMarks.toString()} icon={FileText} trend="Segments remaining" />
        <StatCard title="Similarity Flags" value="0" icon={ShieldAlert} trend="Feature coming soon" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/marks" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 shadow-sm border border-slate-200 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Upload Marks (XLSX)</span>
              <UploadCloud size={18} className="text-ruet-blue dark:text-ruet-gold" />
            </Link>
            <Link href="/dashboard/classes" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10 shadow-sm border border-slate-200 dark:border-white/5">
              <span className="font-semibold text-slate-700 dark:text-slate-200">View Full Schedule</span>
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
                            Series {slot.series}
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