"use client";

import { useState, useEffect } from "react";
import { Loader2, Lock, CheckCircle2, Clock, AlertCircle, Send, ShieldAlert } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Swal from "sweetalert2";

export default function BacklogRegistrationPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/student/backlog-registration");
    if (res.ok) setData(await res.json());
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleToggleCourse = (courseId: string) => {
    const newSet = new Set(selectedCourses);
    if (newSet.has(courseId)) {
      newSet.delete(courseId);
    } else {
      if (newSet.size >= 5) {
        showToast("Maximum of 5 backlog courses allowed.", "error");
        return;
      }
      newSet.add(courseId);
    }
    setSelectedCourses(newSet);
  };

  const handleSubmit = async () => {
    if (selectedCourses.size === 0) return showToast("Select at least one course.", "error");

    const result = await Swal.fire({
      title: "Submit Backlogs?",
      text: "You are registering to sit for these backlog exams. You cannot change this once submitted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Submit",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;
    setIsSubmitting(true);

    const res = await fetch("/api/student/backlog-registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCourseIds: Array.from(selectedCourses) })
    });

    if (res.ok) {
      showToast("Backlog registration submitted", "success");
      fetchData();
    } else {
      showToast("Failed to submit", "error");
    }
    setIsSubmitting(false);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;
  if (!data) return <div className="p-8 text-center text-red-500 font-bold">Failed to load data.</div>;

  const { status, seriesConfig, eligibleCourses } = data;
  const isOpen = seriesConfig?.backlogRegistration?.isOpen;
  const currentYear = parseInt(seriesConfig?.currentSemester.split('-')[0]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldAlert className="text-amber-500" size={32} /> Backlog Registration
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Register to clear previous failures. Limited to Year {currentYear - 1} courses.</p>
      </div>

      {status === "pending" && (
        <div className="glass-panel p-8 rounded-3xl text-center border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
          <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pending Advisor Approval</h2>
          <p className="text-slate-600 dark:text-slate-400">Your backlog registration has been sent to your Course Advisor.</p>
        </div>
      )}

      {status === "approved" && (
        <div className="glass-panel p-8 rounded-3xl text-center border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Backlogs Approved</h2>
          <p className="text-slate-600 dark:text-slate-400">Your backlog exam registration is officially approved.</p>
        </div>
      )}

      {status === "unregistered" && !isOpen && (
        <div className="glass-panel p-8 rounded-3xl text-center border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Portal Locked</h2>
          <p className="text-slate-600 dark:text-slate-400">Backlog registration is currently closed. It usually opens during odd semesters.</p>
        </div>
      )}

      {status === "unregistered" && isOpen && (
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <div className="mb-6 bg-amber-50 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-200 dark:border-amber-500/20">
            <h3 className="font-bold text-amber-800 dark:text-amber-200 text-sm">Academic Rules</h3>
            <ul className="text-xs text-amber-700 dark:text-amber-300 mt-2 list-disc list-inside ml-4 space-y-1">
              <li>You may select a maximum of 5 courses.</li>
              <li>Your previous continuous assessment (CT) marks will carry forward automatically.</li>
              <li>The highest attainable grade in a backlog exam is B+ (3.25 Grade Point).</li>
            </ul>
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Eligible Courses (Year {currentYear - 1})</h3>
          
          {eligibleCourses.length === 0 ? (
            <p className="text-sm italic text-slate-500">You have no uncleared backlogs for this specific academic year.</p>
          ) : (
            <div className="space-y-3">
              {eligibleCourses.map((course: any) => {
                const isSelected = selectedCourses.has(course._id);
                const isDisabled = !isSelected && selectedCourses.size >= 5;
                
                return (
                  <label key={course._id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/5' : isSelected ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 shadow-md cursor-pointer' : 'border-slate-200 bg-white hover:border-amber-300 dark:border-white/10 dark:bg-black/20 cursor-pointer'}`}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      disabled={isDisabled}
                      onChange={() => handleToggleCourse(course._id)}
                      className="h-5 w-5 text-amber-600 rounded focus:ring-amber-500" 
                    />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 dark:text-white">{course.courseCode}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{course.title}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 rounded">Semester {course.semester}</span>
                  </label>
                )
              })}
            </div>
          )}

          {eligibleCourses.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedCourses.size === 0}
              className="mt-8 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-xl"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              Submit Registration ({selectedCourses.size}/5)
            </button>
          )}
        </div>
      )}
    </div>
  );
}