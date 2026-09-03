"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, BookOpen, GraduationCap, Loader2, Network } from "lucide-react";
import { StatCard } from "@/app/components/dashboard/Widgets";

type AnalyticsData = {
  studentStats: { series: string; count: number }[];
  facultyStats: { designation: string; count: number }[];
  totalCourses: number;
  activeSeries: number;
};

export default function DeptAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const res = await fetch("/api/head/analytics");
      if (res.ok) {
        setData(await res.json());
      }
      setIsLoading(false);
    };
    fetchAnalytics();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
      </div>
    );
  }

  if (!data) return null;

  const totalStudents = data.studentStats.reduce((acc, curr) => acc + curr.count, 0);
  const totalFaculty = data.facultyStats.reduce((acc, curr) => acc + curr.count, 0);

  // Find max values for proportional bar scaling
  const maxStudentsInSeries = Math.max(...data.studentStats.map(s => s.count), 1);
  const maxFacultyInRank = Math.max(...data.facultyStats.map(f => f.count), 1);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
          <BarChart3 size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Department Analytics</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">High-level enrollment and curriculum metrics.</p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Enrolled Students" value={totalStudents.toString()} icon={Users} />
        <StatCard title="Total Faculty Members" value={totalFaculty.toString()} icon={GraduationCap} />
        <StatCard title="Active Batches" value={data.activeSeries.toString()} icon={Network} />
        <StatCard title="Courses in Curriculum" value={data.totalCourses.toString()} icon={BookOpen} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        
        {/* Student Enrollment Distribution */}
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Enrollment by Series</h3>
          
          {data.studentStats.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No student data available yet.</p>
          ) : (
            <div className="space-y-5">
              {data.studentStats.map((stat) => {
                const percentage = Math.round((stat.count / maxStudentsInSeries) * 100);
                return (
                  <div key={stat.series}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Series {stat.series}</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">{stat.count} Students</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <div 
                        className="h-full rounded-full bg-ruet-blue transition-all duration-1000 dark:bg-ruet-gold" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Faculty Designation Distribution */}
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <h3 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Faculty Composition</h3>
          
          {data.facultyStats.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No faculty data available yet.</p>
          ) : (
            <div className="space-y-5">
              {data.facultyStats.map((stat) => {
                const percentage = Math.round((stat.count / maxFacultyInRank) * 100);
                return (
                  <div key={stat.designation}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stat.designation}</span>
                      <span className="font-medium text-slate-500 dark:text-slate-400">{stat.count}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                      <div 
                        className="h-full rounded-full bg-emerald-500 transition-all duration-1000 dark:bg-emerald-400" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}