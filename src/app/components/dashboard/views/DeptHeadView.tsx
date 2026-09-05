"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, Database, GraduationCap, Network, BookOpen, Loader2, UserCheck, UserMinus } from "lucide-react";
import { StatCard, AlertBanner } from "../Widgets";

type HeadStats = {
  totalStudents: number;
  activeSeries: number;
  totalFaculty: number;
  totalOnLeave: number;
  totalCourses: number;
  unassignedSeries: string[];
  studentStats: { series: string; count: number }[];
  facultyAvailableStats: { designation: string; count: number }[];
  facultyOnLeaveStats: { designation: string; count: number }[];
};

export default function DeptHeadView({ user }: { user: any }) {
  const [stats, setStats] = useState<HeadStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      const res = await fetch("/api/head/overview");
      if (res.ok) setStats(await res.json());
      setIsLoading(false);
    };
    fetchOverview();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center animate-in fade-in duration-500">
        <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
      </div>
    );
  }

  if (!stats) return null;

  const maxStudentsInSeries = Math.max(...stats.studentStats.map(s => s.count), 1);
  const maxAvailableInRank = Math.max(...stats.facultyAvailableStats.map(f => f.count), 1);
  const maxOnLeaveInRank = Math.max(...stats.facultyOnLeaveStats.map(f => f.count), 1);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 dark:text-white">
        Department Head Control
      </h1>
      
      {/* Dynamic Alerts */}
      {stats.unassignedSeries.length > 0 ? (
        <AlertBanner 
          title="Configuration Required" 
          message={`The following Series require at least one faculty advisor assignment before operations can begin: Series ${stats.unassignedSeries.join(", ")}.`} 
          type="warning"
        />
      ) : (
        <AlertBanner 
          title="All Systems Operational" 
          message="All active batches have assigned Course Advisors. No structural bottlenecks detected." 
        />
      )}

      {/* Live Statistics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Students" value={stats.totalStudents.toString()} icon={Users} />
        <StatCard title="Total Faculty (All)" value={stats.totalFaculty.toString()} icon={GraduationCap} />
        <StatCard title="Active Batches" value={stats.activeSeries.toString()} icon={Database} />
        <StatCard title="Curriculum Courses" value={stats.totalCourses.toString()} icon={BookOpen} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Faculty Composition - NEW SPLIT VIEW */}
          <div className="glass-panel rounded-3xl p-6 md:p-8">
            <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Faculty Composition</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {/* Available Column */}
              <div>
                <h4 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  <UserCheck size={16} /> Active & Available ({stats.totalFaculty - stats.totalOnLeave})
                </h4>
                {stats.facultyAvailableStats.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active faculty found.</p>
                ) : (
                  <div className="space-y-5">
                    {stats.facultyAvailableStats.map((stat) => {
                      const percentage = Math.round((stat.count / maxAvailableInRank) * 100);
                      return (
                        <div key={stat.designation}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stat.designation}</span>
                            <span className="font-medium text-slate-500 dark:text-slate-400">{stat.count}</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                            <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000 dark:bg-emerald-400" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* On Leave Column */}
              <div>
                <h4 className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  <UserMinus size={16} /> Currently On Leave ({stats.totalOnLeave})
                </h4>
                {stats.facultyOnLeaveStats.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic">No faculty members are currently on leave.</p>
                ) : (
                  <div className="space-y-5">
                    {stats.facultyOnLeaveStats.map((stat) => {
                      const percentage = Math.round((stat.count / maxOnLeaveInRank) * 100);
                      return (
                        <div key={stat.designation}>
                          <div className="mb-1 flex justify-between text-sm">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{stat.designation}</span>
                            <span className="font-medium text-slate-500 dark:text-slate-400">{stat.count}</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                            <div className="h-full rounded-full bg-amber-500 transition-all duration-1000 dark:bg-amber-400" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Student Enrollment Distribution */}
          <div className="glass-panel rounded-3xl p-6 md:p-8">
            <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Enrollment by Series</h3>
            {stats.studentStats.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No student data available yet.</p>
            ) : (
              <div className="space-y-5">
                {stats.studentStats.map((stat) => {
                  const percentage = Math.round((stat.count / maxStudentsInSeries) * 100);
                  return (
                    <div key={stat.series}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Series {stat.series}</span>
                        <span className="font-medium text-slate-500 dark:text-slate-400">{stat.count} Students</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div className="h-full rounded-full bg-ruet-blue transition-all duration-1000 dark:bg-ruet-gold" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Actions */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/dashboard/series-manager" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Open Series Manager</span>
                <Network size={18} className="text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}