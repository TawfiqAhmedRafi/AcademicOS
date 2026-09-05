"use client";

import { useState, useEffect } from "react";
import { Loader2, GraduationCap, AlertCircle, FileText, CheckCircle2 } from "lucide-react";

export default function StudentResultsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      const res = await fetch("/api/student/results");
      if (res.ok) setData(await res.json());
      setIsLoading(false);
    };
    fetchResults();
  }, []);

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl mx-auto">
      
      {/* Overview Header */}
      <div className="glass-panel p-8 rounded-3xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-ruet-blue dark:border-l-ruet-gold">
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Official Transcript</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white">Cumulative GPA</h1>
        </div>
        <div className="bg-slate-900 dark:bg-white text-white dark:text-black px-8 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <GraduationCap size={32} />
          <span className="text-4xl font-black">{data.cgpa.toFixed(2)}</span>
        </div>
      </div>

      {/* Active Backlogs Warning */}
      {data.activeBacklogs.length > 0 && (
        <div className="mb-8 p-6 rounded-3xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
            <h3 className="text-xl font-bold text-red-800 dark:text-red-200">Active Backlog Courses</h3>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300/80 mb-4">You must successfully clear these courses to be eligible for graduation. Registration for backlog exams opens during the corresponding odd/even semesters.</p>
          <div className="flex flex-wrap gap-2">
            {data.activeBacklogs.map((course: string) => (
              <span key={course} className="bg-white dark:bg-black/20 border border-red-200 dark:border-red-500/30 px-3 py-1.5 rounded-lg text-sm font-bold text-red-700 dark:text-red-400 shadow-sm">
                {course}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Semester History */}
      {data.academicHistory.length === 0 ? (
        <div className="py-20 text-center text-slate-500">No published results available yet.</div>
      ) : (
        <div className="space-y-8">
          {data.academicHistory.sort((a:any, b:any) => b.semester.localeCompare(a.semester)).map((hist: any, idx: number) => (
            <div key={idx} className="glass-panel rounded-3xl overflow-hidden shadow-sm">
              <div className="bg-slate-50/80 dark:bg-white/5 p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="text-ruet-blue dark:text-ruet-gold" size={20} />
                  Semester {hist.semester}
                </h3>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Term GPA</p>
                  <p className="text-xl font-black text-ruet-blue dark:text-ruet-gold">{hist.semesterGpa.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100/50 dark:bg-slate-800/30">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400">Course Code</th>
                      <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-center">Credits</th>
                      <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-center">Grade Point</th>
                      <th className="px-6 py-3 font-semibold text-slate-500 dark:text-slate-400 text-right">Letter Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {hist.courses.map((course: any) => (
                      <tr key={course.courseCode} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                        <td className="px-6 py-3 font-bold text-slate-900 dark:text-white">{course.courseCode}</td>
                        <td className="px-6 py-3 text-center font-medium text-slate-600 dark:text-slate-400">{course.credits}</td>
                        <td className="px-6 py-3 text-center font-bold text-slate-900 dark:text-white">{course.gradePoint.toFixed(2)}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`px-2.5 py-1 rounded font-bold text-xs ${course.letterGrade === 'F' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                            {course.letterGrade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}