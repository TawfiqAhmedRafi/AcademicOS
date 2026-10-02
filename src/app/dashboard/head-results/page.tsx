"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Inbox, FileText } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Swal from "sweetalert2";

export default function HeadResultsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchDrafts = async () => {
    setIsLoading(true);
    const res = await fetch("/api/head/results");
    if (res.ok) {
      const data = await res.json();
      setDrafts(data.drafts || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchDrafts(); }, []);

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
    }

    setProcessingId(draftId);
    const res = await fetch("/api/head/results", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId, action })
    });

    if (res.ok) {
      showToast(action === "publish" ? "Results Published!" : "Draft Returned to Advisor.", "success");
      fetchDrafts();
    } else {
      showToast("Failed to process request.", "error");
    }
    setProcessingId(null);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Result Approvals</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review and publish tabulated draft results submitted by Course Advisors.</p>
      </div>

      {drafts.length === 0 ? (
        <div className="glass-panel py-24 text-center rounded-3xl flex flex-col items-center">
          <Inbox size={48} className="text-slate-400 mb-4 opacity-50" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Inbox Zero</h2>
          <p className="text-slate-500 mt-2">There are no draft results pending your approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {drafts.map(draft => (
            <div key={draft._id} className="glass-panel rounded-3xl p-6 relative overflow-hidden">
              {processingId === draft._id && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-10 flex items-center justify-center">
                  <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
                </div>
              )}
              
              <div className="flex justify-between items-start mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <FileText className="text-ruet-blue dark:text-ruet-gold" size={24} />
                    Series {draft.series}
                  </h3>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Semester {draft.semester}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compiled By</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{draft.compiledBy}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 mb-6 flex justify-between items-center">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Total Students</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{draft.results.length}</p>
                </div>
                <div className="h-10 w-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Submitted On</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(draft.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction(draft._id, draft.series, draft.semester, "reject")}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 transition-colors flex justify-center items-center gap-2"
                >
                  <XCircle size={18} /> Reject & Return
                </button>
                <button 
                  onClick={() => handleAction(draft._id, draft.series, draft.semester, "publish")}
                  className="flex-[2] py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 transition-colors shadow-sm flex justify-center items-center gap-2"
                >
                  <CheckCircle2 size={18} /> Publish Official Result
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}