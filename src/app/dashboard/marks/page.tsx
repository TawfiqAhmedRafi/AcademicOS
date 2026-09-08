"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Download, Upload, CheckCircle2, EyeOff, FileSpreadsheet, AlertCircle, Check, Filter, Lock } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import DropdownFilter from "@/app/components/DropdownFilter";

type MarkCourse = {
  uniqueId: string;
  courseCode: string;
  title: string;
  series: number;
  type: 'theory' | 'sessional' | 'special';
  isSpecial: boolean;
  teacherCount: number;
  completedSegments: string[];
  isXXPending: boolean;
  isLocked: boolean; // <-- ENFORCED
};

// Dynamic Segments based on Teacher Count & Course Code
const getSegments = (course: MarkCourse) => {
  if (course.type === 'theory') {
    if (course.teacherCount > 1) return ["Class Tests (2)", "Assignment", "Attendance", "Semester Final (Part)"];
    return ["Class Tests (4)", "Assignment", "Attendance", "Semester Final (Full)"];
  }
  
  if (course.type === 'special') {
    const code = course.courseCode;
    // 2nd & 3rd Year Projects
    if (code.includes("2200") || code.includes("3200")) return ["Supervisor", "Showcase", "Board Viva"];
    // 3rd Year Seminar
    if (code.includes("3218")) return ["Supervisor", "Seminar 1", "Seminar 2"];
    // 4th Year Thesis Part 1
    if (code.includes("4100")) return ["Supervisor", "Pre Defense", "Board Viva"];
    // 4th Year Thesis Part 2
    if (code.includes("4200")) return ["Supervisor", "Defense", "Board Viva"];
    
    // Fallback
    return ["Supervisor Marks", "Board Viva", "Defense"]; 
  }
  
  // Standard Sessional/Lab
  return ["Attendance", "Quiz", "Lab Report", "Performance", "Lab Viva", "Lab Final", "Board Viva"];
};

export default function FacultyMarksDashboard() {
  const [courses, setCourses] = useState<MarkCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ courseCode: string, series: number, segment: string } | null>(null);
  
  const { showToast } = useToast();

  // --- Filter State & Dynamic Options ---
  const [seriesFilter, setSeriesFilter] = useState("All");

  const uniqueSeries = Array.from(new Set(courses.map(c => c.series))).sort((a, b) => a - b);
  const seriesOptions = [
    { label: "All Batches", value: "All" },
    ...uniqueSeries.map(s => ({ label: `Series ${s}`, value: String(s) }))
  ];

  const filteredCourses = courses.filter(c => seriesFilter === "All" || String(c.series) === seriesFilter);
  // ------------------------------------------

  const fetchCourses = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    const res = await fetch("/api/faculty/marks-dashboard");
    if (res.ok) {
      const data = await res.json();
      setCourses(data.courses || []);
    }
    if (showSpinner) setIsLoading(false);
  };

  useEffect(() => { fetchCourses(true); }, []);

  const handleHideCourse = async (uniqueId: string) => {
    if (!confirm("Remove this course from your dashboard? You should only do this once all your marks are uploaded.")) return;
    setCourses(prev => prev.filter(c => c.uniqueId !== uniqueId));
    await fetch("/api/faculty/marks-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hide", uniqueId })
    });
    showToast("Course hidden.", "success");
  };

  const handleResolveXX = async (uniqueId: string, value: string) => {
    if (value.length < 5) return;
    showToast("Saving exact course code...", "info");
    const res = await fetch("/api/faculty/marks-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve_xx", uniqueId, resolvedCode: value.toUpperCase() })
    });
    if (res.ok) {
      showToast("Course code locked in!", "success");
      fetchCourses(false); // Silent refresh to load correct name and un-dim the card
    }
  };

  const handleDownloadDemo = async (courseCode: string, series: number, segment: string) => {
    showToast(`Generating template for ${courseCode}...`, "info");
    try {
      const res = await fetch(`/api/faculty/template?courseCode=${encodeURIComponent(courseCode)}&series=${series}&segment=${encodeURIComponent(segment)}`);
      if (!res.ok) throw new Error(await res.text() || "Failed to generate template");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${courseCode.replace(/\s+/g, "_")}_${series}_${segment.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      showToast(error.message || "Failed to download template.", "error");
    }
  };

  const triggerUploadClick = (courseCode: string, series: number, segment: string) => {
    setUploadTarget({ courseCode, series, segment });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    setIsUploading(true);
    showToast(`Uploading and processing marks...`, "info");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseCode", uploadTarget.courseCode);
    formData.append("series", String(uploadTarget.series));
    formData.append("segment", uploadTarget.segment);

    try {
       const res = await fetch("/api/faculty/upload-marks", {
          method: "POST",
          body: formData,
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || "Upload failed");
       
       showToast(data.message, "success");
       fetchCourses(false); // SILENT refresh to update checkmarks without screen flash
    } catch (err: any) {
       showToast(err.message, "error");
    } finally {
       setIsUploading(false);
       setUploadTarget(null);
       if (fileInputRef.current) fileInputRef.current.value = ""; 
    }
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header with Flexbox for the Dropdown */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Marks Upload Portal</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Download Excel templates, input your marks, and upload securely to the engine.</p>
        </div>
        
        {courses.length > 0 && (
          <DropdownFilter
            icon={<Filter size={16} />}
            options={seriesOptions}
            value={seriesFilter}
            onChange={setSeriesFilter}
          />
        )}
      </div>

      {courses.length === 0 ? (
        <div className="glass-panel py-24 text-center rounded-3xl flex flex-col items-center">
          <CheckCircle2 size={48} className="text-emerald-500 mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Caught Up!</h2>
          <p className="text-slate-500 mt-2">You have no active courses requiring marks upload.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...filteredCourses]
            .sort((a, b) => {
              if (a.series !== b.series) return a.series - b.series;
              return a.courseCode.localeCompare(b.courseCode);
            })
            .map((course) => {
            const segments = getSegments(course);

            return (
              <div key={course.uniqueId} className="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg">
                <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 ${course.isSpecial ? 'bg-purple-50/50 dark:bg-purple-500/5' : course.type === 'theory' ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'bg-emerald-50/50 dark:bg-emerald-500/5'}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      
                      {/* Input Box for XX Resolution */}
                      {course.isXXPending ? (
                        <input 
                          type="text" 
                          placeholder="Type Exact Code (e.g. ETE 3212)" 
                          className="px-2 py-1 text-sm font-bold border border-amber-300 rounded focus:outline-none focus:border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 placeholder:font-normal"
                          onBlur={(e) => handleResolveXX(course.uniqueId, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleResolveXX(course.uniqueId, e.currentTarget.value);
                          }}
                        />
                      ) : (
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{course.courseCode}</h2>
                      )}

                      <span className="bg-slate-900 text-white dark:bg-white dark:text-black px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">Series {course.series}</span>
                      <span className="bg-slate-200 text-slate-700 dark:bg-white/20 dark:text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">{course.type}</span>
                      {course.type === "theory" && <span className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{course.teacherCount > 1 ? "Multi-Teacher" : "Single Teacher"}</span>}
                      {course.isSpecial && <span className="bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Broadcast</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-1">{course.title}</p>
                  </div>
                  <button onClick={() => handleHideCourse(course.uniqueId)} className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"><EyeOff size={14} /> Remove</button>
                </div>

                {course.isXXPending && (
                  <div className="bg-amber-50 dark:bg-amber-500/10 p-3 flex items-center gap-2 border-b border-amber-100 dark:border-amber-500/20">
                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">Enter exact course code above to unlock uploads. Press Enter to save.</span>
                  </div>
                )}
                
                {/* --- NEW: TABULATION LOCKOUT BANNER --- */}
                {course.isLocked && (
                  <div className="bg-red-50 dark:bg-red-500/10 p-3 flex items-center gap-2 border-b border-red-100 dark:border-red-500/20">
                    <Lock size={16} className="text-red-600 dark:text-red-400" />
                    <span className="text-xs font-semibold text-red-800 dark:text-red-200">Tabulation Lockout: The Course Advisor is compiling the draft. Uploads are locked.</span>
                  </div>
                )}

                <div className={`p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${course.isXXPending ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                  {segments.map((segment, idx) => {
                    const isCompleted = course.completedSegments.includes(segment);
                    
                    return (
                      <div key={idx} className={`bg-slate-50 dark:bg-black/20 rounded-2xl p-4 border transition-colors flex flex-col justify-between ${isCompleted ? 'border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-white/5'}`}>
                        <div className="mb-4 flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">{segment}</h4>
                            {segment === "Attendance" && <p className="text-[10px] text-slate-500">Template requires Total & Attended.</p>}
                            {segment.includes("Class Tests") && <p className="text-[10px] text-slate-500">Template adapts to teacher count.</p>}
                          </div>
                          {isCompleted && <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />}
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-auto">
                          <button onClick={() => handleDownloadDemo(course.courseCode, course.series, segment)} className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 py-2 rounded-xl text-xs font-bold transition-colors">
                            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" /> Template
                          </button>
                          
                          {/* --- ENFORCING LOCKOUT ON BUTTON --- */}
                          <button 
                            onClick={() => triggerUploadClick(course.courseCode, course.series, segment)}
                            disabled={isUploading || course.isLocked}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 ${course.isLocked ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed' : isCompleted ? 'bg-slate-800 text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-200' : 'bg-ruet-blue text-white hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400'}`}
                          >
                            {isUploading && uploadTarget?.segment === segment && uploadTarget?.courseCode === course.courseCode ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              course.isLocked ? <Lock size={14} /> : isCompleted ? <Check size={14} /> : <Upload size={14} />
                            )}
                            {course.isLocked ? "Locked" : isCompleted ? "Update Marks" : "Upload Marks"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
    </div>
  );
}