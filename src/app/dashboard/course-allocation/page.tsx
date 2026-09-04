"use client";

import { useState, useEffect } from "react";
import { BookOpen, Users, Loader2, Save, Edit2, Layers, CheckCircle2 } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";

type Faculty = { _id: string; name: string; initials: string; designation: string };
type Allocation = { series: number; courseCode: string; type: string; teachers: string[] };

export default function CourseAllocationPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<number | null>(null);

  // Editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempTeachers, setTempTeachers] = useState<string>("");

  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/head/course-allocation");
    if (res.ok) {
      const data = await res.json();
      setFaculty(data.faculty);
      setAllocations(data.allocations);
      
      // Auto-select the newest series tab on initial load
      if (data.allocations.length > 0 && !activeTab) {
        const uniqueSeries = Array.from(new Set(data.allocations.map((a: Allocation) => a.series))).sort((a: any, b: any) => b - a) as number[];
        setActiveTab(uniqueSeries[0]);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFacultyName = (initial: string) => {
    if (["All", "N/A", "TBA"].includes(initial)) return initial;
    const found = faculty.find(f => f.initials === initial);
    return found ? found.name : initial;
  };

  const handleSave = async (series: number, courseCode: string) => {
    const newTeachersArray = tempTeachers.split(",").map(t => t.trim()).filter(Boolean);

    const res = await fetch("/api/head/course-allocation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series, courseCode, newTeachers: newTeachersArray }),
    });

    if (res.ok) {
      setEditingKey(null);
      showToast(`Allocation updated for ${courseCode}`, "success");
      
      // Silent refresh to update the table instantly
      const refreshRes = await fetch("/api/head/course-allocation");
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setAllocations(refreshData.allocations);
      }
    } else {
      showToast("Failed to update allocation.", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
      </div>
    );
  }

  // Group allocations by series
  const groupedAllocations = allocations.reduce((acc, curr) => {
    if (!acc[curr.series]) acc[curr.series] = [];
    acc[curr.series].push(curr);
    return acc;
  }, {} as Record<number, Allocation[]>);

  const sortedSeries = Object.keys(groupedAllocations).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Course Allocation</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage faculty course assignments across all active batches.</p>
        </div>
      </div>

      {/* SERIES TABS */}
      <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar mb-4">
        {sortedSeries.map(seriesStr => {
          const series = Number(seriesStr);
          const isActive = activeTab === series;
          return (
            <button
              key={series}
              onClick={() => setActiveTab(series)}
              className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                isActive
                  ? "bg-ruet-blue text-white shadow-md dark:bg-ruet-gold dark:text-black"
                  : "bg-white/50 text-slate-600 hover:bg-white/80 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              Series {series}
            </button>
          );
        })}
      </div>

      {/* DATA GRID */}
      {activeTab && (
        <div className="glass-panel overflow-hidden rounded-3xl pb-10 animate-in fade-in duration-300">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Course Code</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Category</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Assigned Faculty</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {groupedAllocations[activeTab].map((course) => {
                  const key = `${course.series}-${course.courseCode}`;
                  const isEditing = editingKey === key;

                  return (
                    <tr key={key} className="transition-colors hover:bg-slate-50/30 dark:hover:bg-white/[0.02]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white">{course.courseCode}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          course.type === 'lab' || course.type === 'project' || course.type === 'thesis' 
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" 
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        }`}>
                          <Layers size={12} /> {course.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={tempTeachers}
                            onChange={(e) => setTempTeachers(e.target.value)}
                            placeholder="e.g. FZA, MMH"
                            className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/40 dark:text-white"
                            autoFocus
                          />
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            {course.teachers.map((initial, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-300" title={`Initial: ${initial}`}>
                                <Users size={12} className="text-slate-400" />
                                {getFacultyName(initial)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setEditingKey(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSave(course.series, course.courseCode)}
                              className="flex items-center gap-1 rounded-lg bg-ruet-blue px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
                            >
                              <CheckCircle2 size={14} /> Save
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              setEditingKey(key);
                              setTempTeachers(course.teachers.join(", "));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}