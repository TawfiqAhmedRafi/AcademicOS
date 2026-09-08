"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, Search, Inbox, ArrowRight } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";

export default function PendingApprovalsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [seriesData, setSeriesData] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  // Expanded activeTab to include backlog
  const [activeTab, setActiveTab] = useState<'registration' | 'formFillup' | 'backlog'>('registration');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [payloadModal, setPayloadModal] = useState<any | null>(null);
  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/advisor/roster");
    if (res.ok) {
      const data = await res.json();
      setSeriesData(data.seriesData);
      setStudents(data.students);
      setCourses(data.courses || []); 
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleReview = async (studentId: string, series: string, isApproved: boolean) => {
    setProcessingId(studentId);
    
    let action = "";
    if (activeTab === 'registration') {
      action = isApproved ? "approve_individual_reg" : "reject_individual_reg";
    } else if (activeTab === 'formFillup') {
      action = isApproved ? "approve_individual_ff" : "reject_individual_ff";
    } else {
      // NEW: Backlog Actions
      action = isApproved ? "approve_individual_backlog" : "reject_individual_backlog";
    }

    const res = await fetch("/api/advisor/roster", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series, action, payload: { studentId } })
    });

    if (res.ok) {
      showToast(isApproved ? "Approved successfully" : "Returned to student", "success");
      setStudents(prev => prev.map(s => {
        if (s._id === studentId) {
          if (activeTab === 'registration') return { ...s, registrationStatus: isApproved ? 'approved' : 'unregistered' };
          if (activeTab === 'formFillup') return { ...s, formFillupStatus: isApproved ? 'approved' : 'unregistered' };
          if (activeTab === 'backlog') return { ...s, backlogRegStatus: isApproved ? 'approved' : 'unregistered' }; // NEW
        }
        return s;
      }));
    } else {
      showToast("Failed to process review", "error");
    }
    setProcessingId(null);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;

  const pendingStudents = students.filter(s => 
     activeTab === 'registration' ? s.registrationStatus === 'pending'
       : activeTab === 'formFillup' ? s.formFillupStatus === 'pending'
       : s.backlogRegStatus === 'pending' // NEW
  ).sort((a, b) => {
    const rollA = a.studentId || a.email.split('@')[0];
    const rollB = b.studentId || b.email.split('@')[0];
    return rollA.localeCompare(rollB, undefined, { numeric: true });
  });

  const regPendingCount = students.filter(s => s.registrationStatus === 'pending').length;
  const ffPendingCount = students.filter(s => s.formFillupStatus === 'pending').length;
  const backlogPendingCount = students.filter(s => s.backlogRegStatus === 'pending').length; // NEW

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Action Center</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review and approve individual student submissions.</p>
      </div>

      <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 mb-8">
        <button 
          onClick={() => setActiveTab('registration')}
          className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'registration' ? 'border-ruet-blue text-ruet-blue dark:border-ruet-gold dark:text-ruet-gold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          Course Registrations 
          {regPendingCount > 0 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] dark:bg-blue-500/20 dark:text-blue-400">{regPendingCount}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('formFillup')}
          className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'formFillup' ? 'border-ruet-blue text-ruet-blue dark:border-ruet-gold dark:text-ruet-gold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          Form Fill-ups 
          {ffPendingCount > 0 && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] dark:bg-purple-500/20 dark:text-purple-400">{ffPendingCount}</span>}
        </button>
        
        {/* --- NEW: Backlog Exams Tab --- */}
        <button 
          onClick={() => setActiveTab('backlog')}
          className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'backlog' ? 'border-ruet-blue text-ruet-blue dark:border-ruet-gold dark:text-ruet-gold' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          Backlog Exams 
          {backlogPendingCount > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] dark:bg-amber-500/20 dark:text-amber-400">{backlogPendingCount}</span>}
        </button>
      </div>

      {pendingStudents.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center py-24 text-center rounded-3xl">
          <Inbox className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Queue Empty</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">There are no pending submissions for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pendingStudents.map(student => {
            const roll = student.studentId || student.email.split('@')[0];
            const isProcessing = processingId === student._id;
            
            // Render specific payload arrays based on the tab
            const submissionArray = activeTab === 'backlog' ? student.registeredBacklogs : student.registeredCourses;

            return (
              <div key={student._id} className="glass-panel rounded-3xl p-6 flex flex-col justify-between transition-transform hover:-translate-y-1 relative overflow-hidden">
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10 flex items-center justify-center">
                    <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={24} />
                  </div>
                )}
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-mono font-bold text-sm bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-700 dark:text-slate-300">
                      {roll}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Series {student.series}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{student.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{student.email}</p>
                  
                  <button 
                    onClick={() => setPayloadModal(student)}
                    className="w-full text-left bg-slate-50 dark:bg-white/5 rounded-xl p-4 mb-6 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase mb-2">
                      <span>Submitted Payload</span>
                      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 italic opacity-70">
                      {submissionArray ? `${submissionArray.length} courses selected. Click to view.` : "No courses selected."}
                    </p>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleReview(student._id, student.series, false)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:border-white/10 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 dark:hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle size={16} /> Return
                  </button>
                  <button 
                    onClick={() => handleReview(student._id, student.series, true)}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payload Details Modal */}
      {payloadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a] animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Registration Payload</h2>
              <button onClick={() => setPayloadModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Student: {payloadModal.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{payloadModal.email}</p>
              
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 border-b border-slate-200 dark:border-slate-700 pb-2">Selected Courses</h4>
              
              {/* Check based on which tab was active to render the correct payload */}
              {(() => {
                const targetArray = activeTab === 'backlog' ? payloadModal.registeredBacklogs : payloadModal.registeredCourses;
                if (targetArray && targetArray.length > 0) {
                  return (
                    <ul className="space-y-3">
                      {targetArray.map((id: string, idx: number) => {
                        const courseMatch = courses.find(c => c._id === id);
                        return (
                          <li key={idx} className="flex items-center justify-between bg-white dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {courseMatch ? courseMatch.courseCode : id}
                            </span>
                            {courseMatch && (
                              <span className="text-[10px] uppercase font-semibold text-slate-400 max-w-[50%] text-right truncate" title={courseMatch.title}>
                                {courseMatch.title}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  );
                } else {
                  return <p className="text-sm italic opacity-70 text-slate-500">No courses submitted.</p>;
                }
              })()}

            </div>
            
            <button 
              onClick={() => setPayloadModal(null)}
              className="mt-6 w-full py-3 bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white rounded-xl font-bold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}