"use client";

import { useState, useEffect } from "react";
import { BookOpen, Users, Loader2, Save, GraduationCap, Edit2 } from "lucide-react";

type Faculty = { _id: string; name: string; initials: string; designation: string };
type Allocation = { series: number; courseCode: string; type: string; teachers: string[] };

export default function CourseAllocationPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Editing state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempTeachers, setTempTeachers] = useState<string>("");

  const fetchData = async () => {
    const res = await fetch("/api/head/course-allocation");
    if (res.ok) {
      const data = await res.json();
      setFaculty(data.faculty);
      setAllocations(data.allocations);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getFacultyName = (initial: string) => {
    if (["All", "N/A", "TBA"].includes(initial)) return initial;
    const found = faculty.find(f => f.initials === initial);
    return found ? found.name : initial; // Fallback to initial if not found in DB
  };

  const handleSave = async (series: number, courseCode: string) => {
    // Convert comma-separated string back to array, trimming whitespace
    const newTeachersArray = tempTeachers.split(",").map(t => t.trim()).filter(Boolean);

    const res = await fetch("/api/head/course-allocation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series, courseCode, newTeachers: newTeachersArray }),
    });

    if (res.ok) {
      setEditingKey(null);
      fetchData(); // Silent refresh
    } else {
      alert("Failed to update allocation.");
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Course Allocation</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Map faculty members to routine slots via their initials.</p>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedAllocations).sort((a, b) => Number(b[0]) - Number(a[0])).map(([series, courses]) => (
          <div key={series} className="glass-panel overflow-hidden rounded-3xl">
            
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-white/10 dark:bg-white/5">
              <GraduationCap className="text-ruet-blue dark:text-ruet-gold" size={20} />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Series {series}</h2>
            </div>

            {/* Courses List */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {courses.map((course) => {
                const key = `${course.series}-${course.courseCode}`;
                const isEditing = editingKey === key;

                return (
                  <div key={key} className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/30 dark:hover:bg-white/[0.02] transition-colors">
                    
                    {/* Course Info */}
                    <div className="sm:w-1/3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{course.courseCode}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          course.type === 'lab' || course.type === 'project' || course.type === 'thesis' 
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" 
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                        }`}>
                          {course.type}
                        </span>
                      </div>
                    </div>

                    {/* Teacher Assignment */}
                    <div className="flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={tempTeachers}
                            onChange={(e) => setTempTeachers(e.target.value)}
                            placeholder="e.g. FZA, MMH"
                            className="w-full max-w-xs rounded-lg border border-slate-300 bg-white/50 px-3 py-1.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                          />
                          <button 
                            onClick={() => handleSave(course.series, course.courseCode)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-600"
                          >
                            <Save size={14} /> Save
                          </button>
                          <button onClick={() => setEditingKey(null)} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {course.teachers.map((initial, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300" title={`Initial: ${initial}`}>
                              <Users size={14} className="text-slate-400" />
                              {getFacultyName(initial)}
                            </span>
                          ))}
                          
                          <button 
                            onClick={() => {
                              setEditingKey(key);
                              setTempTeachers(course.teachers.join(", "));
                            }}
                            className="ml-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}