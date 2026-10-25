"use client";

import { useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Inbox, 
  FileText, 
  Eye, 
  X, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  GraduationCap,
  Award,
  Users,
  ShieldCheck,
  Calendar,
  UserCheck
} from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Swal from "sweetalert2";

export default function HeadResultsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "passed" | "failed">("all");
  const [expandedRolls, setExpandedRolls] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  const { showToast } = useToast();

  const fetchDrafts = async () => {
    setIsLoading(true);
    const res = await fetch("/api/head/results");
    if (res.ok) {
      const data = await res.json();
      setDrafts(data.drafts || []);
      // If modal is open, refresh selectedDraft with fresh data if it still exists
      if (selectedDraft) {
        const updated = (data.drafts || []).find((d: any) => d._id === selectedDraft._id);
        setSelectedDraft(updated || null);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => { 
    setMounted(true);
    fetchDrafts(); 
  }, []);

  const toggleExpandRoll = (roll: string) => {
    setExpandedRolls(prev => ({ ...prev, [roll]: !prev[roll] }));
  };

  const expandAll = () => {
    if (!selectedDraft) return;
    const allExpanded: Record<string, boolean> = {};
    selectedDraft.results.forEach((r: any) => {
      allExpanded[r.roll] = true;
    });
    setExpandedRolls(allExpanded);
  };

  const collapseAll = () => {
    setExpandedRolls({});
  };

  const handleAction = async (draftId: string, series: number, semester: string, action: "publish" | "reject") => {
    if (action === "publish") {
      const confirm = await Swal.fire({
        title: "Publish Official Results?",
        text: `You are about to permanently publish the results for Series ${series} (Semester ${semester}). This will immediately update all student CGPAs and unlock their transcripts.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Publish",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#10b981",
      });
      if (!confirm.isConfirmed) return;
    } else if (action === "reject") {
      const confirm = await Swal.fire({
        title: "Reject and Return Draft?",
        text: `This will return the draft for Series ${series} (Semester ${semester}) to the advisor for revisions.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Return to Advisor",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ef4444",
      });
      if (!confirm.isConfirmed) return;
    }

    setProcessingId(draftId);
    const res = await fetch("/api/head/results", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, action })
    });

    if (res.ok) {
      showToast(action === "publish" ? "Results Officially Published!" : "Draft Returned to Advisor.", "success");
      setSelectedDraft(null);
      await fetchDrafts();
    } else {
      showToast("Failed to process request.", "error");
    }
    setProcessingId(null);
  };

  // Filtered results for the modal
  const filteredResults = (selectedDraft?.results || []).filter((r: any) => {
    const matchesQuery = 
      r.roll?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.name?.toLowerCase().includes(searchQuery.toLowerCase());

    const hasFailedCourses = (r.failedCourses && r.failedCourses.length > 0) || 
      (r.courseGrades && r.courseGrades.some((c: any) => c.gradePoint === 0)) ||
      (r.backlogGrades && r.backlogGrades.some((b: any) => b.gradePoint === 0));

    if (!matchesQuery) return false;
    if (filterType === "passed") return !hasFailedCourses;
    if (filterType === "failed") return hasFailedCourses;
    return true;
  });

  // Calculate statistics for active preview
  const draftStats = selectedDraft ? {
    total: selectedDraft.results.length,
    passedCount: selectedDraft.results.filter((r: any) => !r.failedCourses?.length && !r.courseGrades?.some((c: any) => c.gradePoint === 0)).length,
    failedCount: selectedDraft.results.filter((r: any) => r.failedCourses?.length > 0 || r.courseGrades?.some((c: any) => c.gradePoint === 0)).length,
    avgSgpa: selectedDraft.results.length 
      ? (selectedDraft.results.reduce((acc: number, r: any) => acc + (r.semesterGpa || 0), 0) / selectedDraft.results.length).toFixed(2)
      : "0.00",
    avgCgpa: selectedDraft.results.length 
      ? (selectedDraft.results.reduce((acc: number, r: any) => acc + (r.cgpa || 0), 0) / selectedDraft.results.length).toFixed(2)
      : "0.00"
  } : null;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Result Approvals</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Review and officially publish tabulated draft results submitted by Course Advisors across all department series.
        </p>
      </div>

      {drafts.length === 0 ? (
        <div className="glass-panel py-24 text-center rounded-3xl flex flex-col items-center">
          <Inbox size={48} className="text-slate-400 mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inbox Zero</h2>
          <p className="text-slate-500 mt-2">There are no draft results currently pending Head of Department approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {drafts.map(draft => (
            <div 
              key={draft._id} 
              className="glass-panel rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-ruet-blue/30 dark:hover:border-ruet-gold/30"
            >
              {processingId === draft._id && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm z-20 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={36} />
                    <span className="text-sm font-bold text-slate-800 dark:text-white">Processing Action...</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <FileText className="text-ruet-blue dark:text-ruet-gold" size={24} />
                    Series {draft.series}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                    Semester {draft.semester}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compiled By</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={draft.compiledBy}>
                    {draft.compiledBy}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-6 grid grid-cols-2 divide-x divide-slate-200 dark:divide-white/10 text-center">
                <div className="pr-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">{draft.results.length}</p>
                </div>
                <div className="pl-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted On</p>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {draft.submittedAt ? new Date(draft.submittedAt).toLocaleDateString() : "Recent"}
                  </p>
                </div>
              </div>

              {/* View/Inspect Sheet Button */}
              <button
                onClick={() => {
                  setSelectedDraft(draft);
                  setSearchQuery("");
                  setFilterType("all");
                  setExpandedRolls({});
                }}
                className="w-full py-3 mb-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-800 dark:from-white/10 dark:to-white/5 dark:hover:from-white/15 dark:hover:to-white/10 dark:text-ruet-gold border border-blue-200/50 dark:border-white/10 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Eye size={18} /> Inspect Tabulation Sheet ({draft.results.length} Students)
              </button>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction(draft._id, draft.series, draft.semester, "reject")}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors flex justify-center items-center gap-2 border border-red-200/50 dark:border-red-500/20"
                >
                  <XCircle size={18} /> Reject & Return
                </button>
                <button 
                  onClick={() => handleAction(draft._id, draft.series, draft.semester, "publish")}
                  className="flex-[2] py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors shadow-md flex justify-center items-center gap-2 font-semibold"
                >
                  <CheckCircle2 size={18} /> Publish Official Result
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL INSPECT DRAFT MODAL PORTALED ABOVE SIDEBAR */}
      {selectedDraft && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6 lg:p-8 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1322] border border-slate-200 dark:border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-[1360px] h-[95vh] sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 flex items-start sm:items-center justify-between gap-3 relative">
              <div className="flex items-center gap-3 pr-8 sm:pr-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-ruet-blue/10 dark:bg-ruet-gold/10 flex items-center justify-center text-ruet-blue dark:text-ruet-gold shrink-0">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white flex flex-wrap items-center gap-2 leading-tight">
                    Series {selectedDraft.series} Result Tabulation
                    <span className="text-[11px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-bold">
                      {selectedDraft.semester}
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                    Compiled by <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedDraft.compiledBy}</span> • {new Date(selectedDraft.submittedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDraft(null)}
                className="absolute right-3 top-3 sm:static p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Metrics Overview Cards */}
            {draftStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 px-4 sm:px-6 bg-slate-100/50 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-sm">
                <div className="flex items-center gap-2.5 sm:gap-3 bg-white/60 dark:bg-white/5 p-2 sm:p-0 rounded-xl sm:rounded-none sm:bg-transparent">
                  <Users className="text-blue-500 shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold truncate">Total Students</div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{draftStats.total}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 bg-white/60 dark:bg-white/5 p-2 sm:p-0 rounded-xl sm:rounded-none sm:bg-transparent">
                  <Award className="text-emerald-500 shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold truncate">All Cleared</div>
                    <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{draftStats.passedCount}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 bg-white/60 dark:bg-white/5 p-2 sm:p-0 rounded-xl sm:rounded-none sm:bg-transparent">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold truncate">With Failures</div>
                    <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">{draftStats.failedCount}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:gap-3 bg-white/60 dark:bg-white/5 p-2 sm:p-0 rounded-xl sm:rounded-none sm:bg-transparent">
                  <GraduationCap className="text-purple-500 shrink-0" size={18} />
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase font-semibold truncate">Avg SGPA / CGPA</div>
                    <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">{draftStats.avgSgpa} / {draftStats.avgCgpa}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div className="p-3 sm:p-4 px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-transparent">
              <div className="relative w-full md:flex-1 md:min-w-[240px]">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by roll or student name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-ruet-blue/30 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 w-full md:w-auto">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
                  <button
                    onClick={() => setFilterType("all")}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${filterType === "all" ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
                  >
                    All ({selectedDraft.results.length})
                  </button>
                  <button
                    onClick={() => setFilterType("passed")}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${filterType === "passed" ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
                  >
                    Passed ({draftStats?.passedCount || 0})
                  </button>
                  <button
                    onClick={() => setFilterType("failed")}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${filterType === "failed" ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm font-bold" : "text-slate-500 hover:text-slate-900 dark:hover:text-white"}`}
                  >
                    With Backlog ({draftStats?.failedCount || 0})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                  <button
                    onClick={expandAll}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 whitespace-nowrap"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 whitespace-nowrap"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Tabulation Table */}
            <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
              <div className="sm:hidden px-4 py-2 bg-slate-50 dark:bg-white/5 text-[11px] text-slate-400 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                <span>← Swipe table horizontally to see all columns</span>
              </div>
              <table className="w-full min-w-[700px] text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">Roll Number</th>
                    <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">Student Name</th>
                    <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 text-center">Term GPA</th>
                    <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 text-center">CGPA</th>
                    <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 text-center">Earned Credits</th>
                    <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">Status & Remarks</th>
                    <th className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400">
                        No students match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredResults
                      .sort((a: any, b: any) => String(a.roll).localeCompare(String(b.roll)))
                      .map((res: any) => {
                        const isExpanded = !!expandedRolls[res.roll];
                        const hasFails = (res.failedCourses && res.failedCourses.length > 0) || 
                                         (res.courseGrades && res.courseGrades.some((c: any) => c.gradePoint === 0));

                        return (
                          <Fragment key={res.roll}>
                            <tr 
                              onClick={() => toggleExpandRoll(res.roll)}
                              className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors cursor-pointer select-none"
                            >
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: hasFails ? '#ef4444' : '#10b981' }}></span>
                                {res.roll}
                              </td>
                              <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                                {res.name}
                              </td>
                              <td className="px-5 py-3.5 text-center font-black">
                                <span className={
                                  res.semesterGpa >= 3.75 ? "text-emerald-600 dark:text-emerald-400" :
                                  res.semesterGpa >= 3.0 ? "text-blue-600 dark:text-blue-400" :
                                  "text-amber-600 dark:text-amber-400"
                                }>
                                  {Number(res.semesterGpa || 0).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center font-bold text-slate-900 dark:text-white">
                                {Number(res.cgpa || 0).toFixed(2)}
                              </td>
                              <td className="px-5 py-3.5 text-center text-slate-600 dark:text-slate-300 font-semibold">
                                {Number(res.earnedCredits || 0).toFixed(2)}
                              </td>
                              <td className="px-5 py-3.5">
                                {hasFails ? (
                                  <div className="flex flex-wrap gap-1">
                                    {(res.failedCourses || []).map((fc: string) => (
                                      <span key={fc} className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <AlertCircle size={10} /> {fc} (F)
                                      </span>
                                    ))}
                                    {(!res.failedCourses || res.failedCourses.length === 0) && (
                                      <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-[11px] font-bold px-2 py-0.5 rounded-md">
                                        Failed Course
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                                    <CheckCircle2 size={11} /> All Cleared
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right text-slate-400">
                                <button
                                  type="button"
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-white/10 rounded transition-colors text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 text-xs font-semibold"
                                >
                                  {isExpanded ? (
                                    <><span>Hide</span> <ChevronUp size={16} /></>
                                  ) : (
                                    <><span>View Marks</span> <ChevronDown size={16} /></>
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Subject Breakdown Table with Type-Distinct Views */}
                            {isExpanded && (
                              <tr className="bg-slate-50/90 dark:bg-black/30 border-y border-slate-200 dark:border-white/10">
                                <td colSpan={7} className="p-2.5 sm:p-4 px-3 sm:px-8 space-y-4">
                                  
                                  {/* 1. THEORY COURSES TABLE */}
                                  {(() => {
                                    const theoryCourses = (res.courseGrades || []).filter((c: any) => c.courseType === "theory" || (!c.courseType && c.isTheory !== false));
                                    if (theoryCourses.length === 0) return null;
                                    return (
                                      <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-3 sm:p-4 border border-blue-200/60 dark:border-blue-900/40 shadow-sm overflow-x-auto custom-scrollbar">
                                        <div className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                            Theory Courses ({theoryCourses.length})
                                          </div>
                                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            Attendance (10%) • CT Avg (20%) • Assignment (10%) • Semester Finals (60%)
                                          </span>
                                        </div>
                                        <table className="w-full min-w-[620px] text-xs">
                                          <thead className="bg-blue-50/50 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 text-slate-600 dark:text-slate-300 uppercase font-bold">
                                            <tr>
                                              <th className="py-2.5 px-3 text-left">Course Code</th>
                                              <th className="py-2.5 px-3 text-left">Credits</th>
                                              <th className="py-2.5 px-3 text-center">Attendance</th>
                                              <th className="py-2.5 px-3 text-center">CT (Avg Best 3)</th>
                                              <th className="py-2.5 px-3 text-center">Assignment</th>
                                              <th className="py-2.5 px-3 text-center">Semester Finals</th>
                                              <th className="py-2.5 px-3 text-center">Total Marks</th>
                                              <th className="py-2.5 px-3 text-center">Letter Grade</th>
                                              <th className="py-2.5 px-3 text-center">Grade Point</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                            {theoryCourses.map((cg: any) => (
                                              <tr key={cg.courseCode} className={cg.gradePoint === 0 ? "bg-red-50/50 dark:bg-red-500/10 text-red-900 dark:text-red-300" : "hover:bg-slate-50/50 dark:hover:bg-white/5"}>
                                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                  {cg.courseCode}
                                                </td>
                                                <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">{cg.credits} Cr</td>
                                                <td className="py-2.5 px-3 text-center font-mono">{cg.breakdown?.attendance ?? cg.attendanceMarks ?? "-"}</td>
                                                <td className="py-2.5 px-3 text-center font-mono font-semibold">{cg.breakdown?.ctAvg ?? cg.ctMarks ?? "-"}</td>
                                                <td className="py-2.5 px-3 text-center font-mono">{cg.breakdown?.assignment ?? cg.assignmentMarks ?? "-"}</td>
                                                <td className="py-2.5 px-3 text-center font-mono font-semibold">{cg.breakdown?.semesterFinal ?? cg.finalMarks ?? "-"}</td>
                                                <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">{cg.totalMarks ?? "-"}</td>
                                                <td className="py-2.5 px-3 text-center">
                                                  <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                                                    cg.letterGrade === "F" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" :
                                                    cg.letterGrade?.startsWith("A") ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" :
                                                    "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                                  }`}>
                                                    {cg.letterGrade}
                                                  </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-center font-mono font-bold">{cg.gradePoint?.toFixed(2)}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    );
                                  })()}

                                  {/* 2. LAB / SESSIONAL COURSES TABLE */}
                                  {(() => {
                                    const labCourses = (res.courseGrades || []).filter((c: any) => c.courseType === "lab");
                                    if (labCourses.length === 0) return null;
                                    return (
                                      <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-3 sm:p-4 border border-purple-200/60 dark:border-purple-900/40 shadow-sm overflow-x-auto custom-scrollbar">
                                        <div className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                            Sessional / Lab Courses ({labCourses.length})
                                          </div>
                                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            Attendance • Quiz • Assessment (Report, Viva, Perf, Lab Final) • Board Viva
                                          </span>
                                        </div>
                                        <table className="w-full min-w-[660px] text-xs">
                                          <thead className="bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30 text-slate-600 dark:text-slate-300 uppercase font-bold">
                                            <tr>
                                              <th className="py-2.5 px-3 text-left">Course Code</th>
                                              <th className="py-2.5 px-3 text-left">Credits</th>
                                              <th className="py-2.5 px-3 text-center">Attendance</th>
                                              <th className="py-2.5 px-3 text-center">Quiz</th>
                                              <th className="py-2.5 px-3 text-center">Assessment (Report, Viva, Perf, Final)</th>
                                              <th className="py-2.5 px-3 text-center">Board Viva</th>
                                              <th className="py-2.5 px-3 text-center">Total Marks</th>
                                              <th className="py-2.5 px-3 text-center">Letter Grade</th>
                                              <th className="py-2.5 px-3 text-center">Grade Point</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                            {labCourses.map((cg: any) => {
                                              const b = cg.breakdown;
                                              const assessmentTotal = b?.assessment ?? cg.labContinuousMarks ?? "-";
                                              const details = b ? `Report: ${b.report || 0}, Perf: ${b.performance || 0}, Viva: ${b.labViva || 0}, Final: ${b.labFinal || 0}` : "";

                                              return (
                                                <tr key={cg.courseCode} className={cg.gradePoint === 0 ? "bg-red-50/50 dark:bg-red-500/10 text-red-900 dark:text-red-300" : "hover:bg-slate-50/50 dark:hover:bg-white/5"}>
                                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                    {cg.courseCode}
                                                  </td>
                                                  <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">{cg.credits} Cr</td>
                                                  <td className="py-2.5 px-3 text-center font-mono">{b?.attendance ?? cg.attendanceMarks ?? "-"}</td>
                                                  <td className="py-2.5 px-3 text-center font-mono">{b?.quiz ?? "-"}</td>
                                                  <td className="py-2.5 px-3 text-center font-mono" title={details}>
                                                    <span className="font-bold text-slate-900 dark:text-white">{assessmentTotal}</span>
                                                    {details && <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">({details})</span>}
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-mono font-semibold">{b?.boardViva ?? cg.finalMarks ?? "-"}</td>
                                                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">{cg.totalMarks ?? "-"}</td>
                                                  <td className="py-2.5 px-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                                                      cg.letterGrade === "F" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" :
                                                      cg.letterGrade?.startsWith("A") ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" :
                                                      "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                                    }`}>
                                                      {cg.letterGrade}
                                                    </span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-mono font-bold">{cg.gradePoint?.toFixed(2)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    );
                                  })()}

                                  {/* 3. PROJECT, THESIS & SEMINAR COURSES TABLE */}
                                  {(() => {
                                    const projectOrSeminar = (res.courseGrades || []).filter((c: any) => ["project", "thesis", "seminar"].includes(c.courseType));
                                    if (projectOrSeminar.length === 0) return null;
                                    return (
                                      <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-3 sm:p-4 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm overflow-x-auto custom-scrollbar">
                                        <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            Project, Thesis & Seminar Courses ({projectOrSeminar.length})
                                          </div>
                                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                            Supervisor • Showcase / Defense / Seminar 1 • Board Viva / Seminar 2
                                          </span>
                                        </div>
                                        <table className="w-full min-w-[580px] text-xs">
                                          <thead className="bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 text-slate-600 dark:text-slate-300 uppercase font-bold">
                                            <tr>
                                              <th className="py-2.5 px-3 text-left">Course Code</th>
                                              <th className="py-2.5 px-3 text-left">Type & Credits</th>
                                              <th className="py-2.5 px-3 text-center">Supervisor</th>
                                              <th className="py-2.5 px-3 text-center">Showcase / Defense / Seminar 1</th>
                                              <th className="py-2.5 px-3 text-center">Board Viva / Seminar 2</th>
                                              <th className="py-2.5 px-3 text-center">Total Marks</th>
                                              <th className="py-2.5 px-3 text-center">Letter Grade</th>
                                              <th className="py-2.5 px-3 text-center">Grade Point</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                            {projectOrSeminar.map((cg: any) => {
                                              const b = cg.breakdown;
                                              const isProj = cg.courseType === "project";
                                              const isThesis = cg.courseType === "thesis";
                                              const isSem = cg.courseType === "seminar";

                                              const seg2 = isProj ? b?.showcase : isThesis ? b?.defense : isSem ? b?.seminar1 : "-";
                                              const seg2Label = isProj ? "Showcase" : isThesis ? "Defense" : "Sem 1";
                                              
                                              const seg3 = isProj || isThesis ? b?.boardViva : isSem ? b?.seminar2 : "-";
                                              const seg3Label = isProj || isThesis ? "Board Viva" : "Sem 2";

                                              return (
                                                <tr key={cg.courseCode} className={cg.gradePoint === 0 ? "bg-red-50/50 dark:bg-red-500/10 text-red-900 dark:text-red-300" : "hover:bg-slate-50/50 dark:hover:bg-white/5"}>
                                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                    {cg.courseCode}
                                                  </td>
                                                  <td className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-300">
                                                    <span className="text-[10px] px-2 py-0.5 rounded font-bold mr-1.5 uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                                      {cg.courseType}
                                                    </span>
                                                    {cg.credits} Cr
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-mono font-semibold">{b?.supervisor ?? "-"}</td>
                                                  <td className="py-2.5 px-3 text-center font-mono">
                                                    <span className="font-bold">{seg2 ?? "-"}</span>
                                                    <span className="text-[10px] text-slate-400 block font-sans">({seg2Label})</span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-mono">
                                                    <span className="font-bold">{seg3 ?? "-"}</span>
                                                    <span className="text-[10px] text-slate-400 block font-sans">({seg3Label})</span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white font-mono">{cg.totalMarks ?? "-"}</td>
                                                  <td className="py-2.5 px-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded font-black text-[11px] ${
                                                      cg.letterGrade === "F" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" :
                                                      cg.letterGrade?.startsWith("A") ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300" :
                                                      "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300"
                                                    }`}>
                                                      {cg.letterGrade}
                                                    </span>
                                                  </td>
                                                  <td className="py-2.5 px-3 text-center font-mono font-bold">{cg.gradePoint?.toFixed(2)}</td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    );
                                  })()}

                                  {/* 4. BACKLOG COURSES (IF ANY) */}
                                  {(res.backlogGrades || []).length > 0 && (
                                    <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 border border-amber-200/60 dark:border-amber-900/40 shadow-sm overflow-x-auto">
                                      <div className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        Backlog Courses ({res.backlogGrades.length})
                                      </div>
                                      <table className="w-full text-xs">
                                        <thead className="bg-amber-50/50 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30 text-slate-600 dark:text-slate-300 uppercase font-bold">
                                          <tr>
                                            <th className="py-2.5 px-3 text-left">Course Code</th>
                                            <th className="py-2.5 px-3 text-left">Credits</th>
                                            <th className="py-2.5 px-3 text-center">Total Marks</th>
                                            <th className="py-2.5 px-3 text-center">Letter Grade</th>
                                            <th className="py-2.5 px-3 text-center">Grade Point</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                                          {res.backlogGrades.map((bg: any) => (
                                            <tr key={bg.courseCode} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">{bg.courseCode}</td>
                                              <td className="py-2.5 px-3 font-semibold">{bg.credits} Cr</td>
                                              <td className="py-2.5 px-3 text-center font-bold font-mono">{bg.totalMarks ?? "-"}</td>
                                              <td className="py-2.5 px-3 text-center font-black">{bg.letterGrade}</td>
                                              <td className="py-2.5 px-3 text-center font-mono font-bold">{bg.gradePoint?.toFixed(2)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer with Actions */}
            <div className="p-3 sm:p-4 px-4 sm:px-6 border-t border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Viewing <span className="font-bold text-slate-900 dark:text-white">{filteredResults.length}</span> of <span className="font-bold text-slate-900 dark:text-white">{selectedDraft.results.length}</span> students
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => setSelectedDraft(null)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white transition-colors text-center"
                >
                  Close
                </button>
                <button
                  disabled={processingId === selectedDraft._id}
                  onClick={() => handleAction(selectedDraft._id, selectedDraft.series, selectedDraft.semester, "reject")}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <XCircle size={17} /> Reject & Return
                </button>
                <button
                  disabled={processingId === selectedDraft._id}
                  onClick={() => handleAction(selectedDraft._id, selectedDraft.series, selectedDraft.semester, "publish")}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-semibold"
                >
                  {processingId === selectedDraft._id ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                  Publish Official Results
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </div>
  );
}