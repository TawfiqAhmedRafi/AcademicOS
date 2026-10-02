"use client";

import { useState, useEffect } from "react";
import { Loader2, Calculator, Send, AlertCircle, CheckCircle2, Lock, FileText, Download, ShieldAlert } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Swal from "sweetalert2";

export default function TabulationEnginePage() {
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [activeConfig, setActiveConfig] = useState<any>(null);
  const [draft, setDraft] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); 
  
  // --- NEW: Toggle between Regular and Backlog modes ---
  const [mode, setMode] = useState<"regular" | "backlog">("regular");
  
  const { showToast } = useToast();

  useEffect(() => {
    const fetchInitData = async () => {
      const res = await fetch("/api/advisor/roster");
      if (res.ok) {
        const data = await res.json();
        setSeriesData(data.seriesData);
        if (data.seriesData.length > 0) setActiveConfig(data.seriesData[0]);
      }
      setIsLoading(false);
    };
    fetchInitData();
  }, []);

  const fetchDraft = async (series: string, semester: string, currentMode: string) => {
    const isBacklog = currentMode === "backlog";
    const res = await fetch(`/api/advisor/compile-result?series=${series}&semester=${semester}&isBacklog=${isBacklog}`);
    if (res.ok) {
      const data = await res.json();
      setDraft(data.draft);
    } else {
      setDraft(null);
    }
  };

  useEffect(() => {
    if (activeConfig) fetchDraft(activeConfig.series, activeConfig.currentSemester, mode);
  }, [activeConfig, mode]);

  const handleCompile = async () => {
    setIsCompiling(true);
    showToast(mode === "backlog" ? "Aggregating backlog marks..." : "Aggregating faculty marks...", "info");
    
    const res = await fetch("/api/advisor/compile-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        series: activeConfig.series, 
        semester: activeConfig.currentSemester,
        isBacklog: mode === "backlog" // Pass the mode flag to the backend
      })
    });

    if (res.ok) {
      showToast(mode === "backlog" ? "Unified Backlog Sheet compiled!" : "Draft Result Sheet compiled!", "success");
      await fetchDraft(activeConfig.series, activeConfig.currentSemester, mode);
    } else {
      const data = await res.json();
      showToast(data.error || "Compilation failed.", "error");
    }
    setIsCompiling(false);
  };

  const handleForwardToHead = async () => {
    const result = await Swal.fire({
      title: "Submit to Department Head?",
      text: "This will lock the draft. You will not be able to recompile unless the Head rejects it.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, submit it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    const res = await fetch("/api/advisor/compile-result", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        series: activeConfig.series, 
        semester: activeConfig.currentSemester, 
        isBacklog: mode === "backlog",
        action: "submit_to_head" 
      })
    });

    if (res.ok) {
      showToast("Forwarded to Head successfully", "success");
      await fetchDraft(activeConfig.series, activeConfig.currentSemester, mode);
    } else {
      showToast("Failed to submit.", "error");
    }
    setIsSubmitting(false);
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    showToast("Generating official PDF...", "info");
    try {
      const res = await fetch(`/api/advisor/tabulation-pdf?series=${activeConfig.series}&semester=${activeConfig.currentSemester}&isBacklog=${mode === "backlog"}`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Tabulation_Series_${activeConfig.series}_${mode === "backlog" ? "BACKLOG" : activeConfig.currentSemester}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Couldn't generate the PDF.", "error");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;
  const isLocked = draft?.status === "pending_head_approval" || draft?.status === "published";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Result Engine</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Compile aggregated faculty marks into official Draft Result Sheets.</p>
        </div>
        
        {/* --- NEW: Mode Switcher --- */}
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-max">
          <button 
            onClick={() => setMode("regular")} 
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === "regular" ? "bg-white text-ruet-blue shadow-sm dark:bg-slate-800 dark:text-ruet-gold" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <FileText size={16}/> Regular Exam
          </button>
          <button 
            onClick={() => setMode("backlog")} 
            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${mode === "backlog" ? "bg-white text-amber-600 shadow-sm dark:bg-slate-800 dark:text-amber-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            <ShieldAlert size={16}/> Unified Backlogs
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
        {seriesData.map(cfg => (
          <button
            key={cfg.series}
            onClick={() => setActiveConfig(cfg)}
            className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeConfig?.series === cfg.series
                ? mode === "backlog" ? "bg-amber-500 text-white shadow-md" : "bg-ruet-blue text-white shadow-md dark:bg-ruet-gold dark:text-black"
                : "bg-white/50 text-slate-600 hover:bg-white/80 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            Series {cfg.series} <span className="ml-2 opacity-70 font-normal">Sem {cfg.currentSemester}</span>
          </button>
        ))}
      </div>

      {activeConfig && (
        <div className="glass-panel rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-white/10">
          
          <div className="bg-slate-50/50 dark:bg-white/5 p-6 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {mode === "backlog" ? <ShieldAlert className="text-amber-500" size={20} /> : <FileText className="text-ruet-blue dark:text-ruet-gold" size={20} />}
                {mode === "backlog" ? "Unified Backlog Preview" : "Draft Preview"}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isLocked ? "This draft is locked for review." : "You can recompile this draft as many times as needed before submitting."}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {draft?.status === "published" && (
                <button 
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Download Official PDF
                </button>
              )}
              <button 
                onClick={handleCompile}
                disabled={isCompiling || isLocked}
                className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                {isCompiling ? <Loader2 size={16} className="animate-spin" /> : isLocked ? <Lock size={16} /> : <Calculator size={16} />}
                {isLocked ? "Locked" : draft ? "Recompile Draft" : "Compile Results"}
              </button>
              {draft && (
                <button 
                  onClick={handleForwardToHead}
                  disabled={isSubmitting || isLocked}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : isLocked ? <CheckCircle2 size={16} /> : <Send size={16} />}
                  {draft.status === "published" ? "Published" : isLocked ? "Sent to Head" : "Submit to Head"}
                </button>
              )}
            </div>
          </div>

          {!draft ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Calculator className="text-slate-400 dark:text-slate-500" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Draft Generated</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">Click the Compile button above to calculate the metrics based on the uploaded faculty marks.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Roll Number</th>
                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300">Student Name</th>
                    {mode === "regular" && <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-center">Term GPA</th>}
                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-center">CGPA</th>
                    {mode === "regular" && <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-center">Earned Credits</th>}
                    <th className="px-6 py-4 font-bold text-slate-600 dark:text-slate-300 text-right">Remarks / Courses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {draft.results.sort((a: any, b: any) => a.roll.localeCompare(b.roll)).map((res: any) => (
                    <tr key={res.roll} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{res.roll}</td>
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{res.name}</td>
                      
                      {mode === "regular" && (
                        <td className="px-6 py-4 text-center">
                          <span className={`font-black ${res.semesterGpa >= 3.75 ? 'text-emerald-600 dark:text-emerald-400' : res.semesterGpa >= 3.0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {res.semesterGpa.toFixed(2)}
                          </span>
                        </td>
                      )}
                      
                      <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">
                        {res.cgpa.toFixed(2)}
                      </td>
                      
                      {mode === "regular" && (
                        <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400 font-medium">
                          {res.earnedCredits.toFixed(2)}
                        </td>
                      )}
                      
                      <td className="px-6 py-4 text-right">
                        {mode === "backlog" ? (
                          // Render Backlog Results
                          res.backlogGrades && res.backlogGrades.length > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              {res.backlogGrades.map((bg: any) => (
                                <span key={bg.courseCode} className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${bg.gradePoint > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'}`}>
                                  {bg.gradePoint === 0 ? <AlertCircle size={10} /> : <CheckCircle2 size={10} />}
                                  {bg.courseCode} ({bg.letterGrade})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">N/A</span>
                          )
                        ) : (
                          // Render Regular Results
                          res.failedCourses && res.failedCourses.length > 0 ? (
                            <div className="flex flex-col items-end gap-1">
                              {res.failedCourses.map((fc: string) => (
                                <span key={fc} className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                  <AlertCircle size={10} /> {fc} (F)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-emerald-500 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center justify-end gap-1">
                              <CheckCircle2 size={12} /> Cleared
                            </span>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}