"use client";

import { useState, useEffect } from "react";
import { Loader2, Lock, CheckCircle2, Clock, BookOpen, AlertCircle, Send } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import Swal from "sweetalert2";

export default function StudentRegistrationPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedElectives, setSelectedElectives] = useState<Set<string>>(new Set());
  
  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/student/registration");
    if (res.ok) {
      setData(await res.json());
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Handle elective checkbox toggles
  const handleToggleElective = (courseId: string) => {
    const newSet = new Set(selectedElectives);
    if (newSet.has(courseId)) {
      newSet.delete(courseId);
    } else {
      newSet.add(courseId);
    }
    setSelectedElectives(newSet);
  };

  const handleSubmit = async () => {
   const result = await Swal.fire({
  title: "Are you sure?",
  text: "Are you sure you want to submit your course list? You will not be able to edit it once submitted .",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Yes, Submit",
  cancelButtonText: "Cancel",
  reverseButtons: true,
});

if (!result.isConfirmed) return;
    
    setIsSubmitting(true);
    
    // Combine mandatory course IDs with selected elective IDs
    const mandatoryIds = data.courses.filter((c: any) => !c.isElective).map((c: any) => c._id);
    const finalSelection = [...mandatoryIds, ...Array.from(selectedElectives)];

    const res = await fetch("/api/student/registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedCourseIds: finalSelection })
    });

    if (res.ok) {
      showToast("Registration submitted successfully", "success");
      fetchData(); // Refresh to show pending state
    } else {
      showToast("Failed to submit registration", "error");
    }
    setIsSubmitting(false);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;
  if (!data) return <div className="p-8 text-center text-red-500 font-bold">Failed to load registration data.</div>;

  const { status, seriesConfig, courses } = data;
  const isOpen = seriesConfig?.registration?.isOpen;
  const deadline = seriesConfig?.registration?.deadline;

  // Split courses for UI
  const coreCourses = courses.filter((c: any) => !c.isElective);
  const electiveCourses = courses.filter((c: any) => c.isElective);

  // Calculate dynamic credits
  const coreCredits = coreCourses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);
  const electiveCredits = electiveCourses
    .filter((c: any) => selectedElectives.has(c._id))
    .reduce((sum: number, c: any) => sum + (c.credits || 0), 0);
  const totalCredits = coreCredits + electiveCredits;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Course Registration</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Semester {seriesConfig?.currentSemester} | Series {seriesConfig?.series}
        </p>
      </div>

      {/* --- STATE 1: APPROVED --- */}
      {status === "approved" && (
        <div className="glass-panel p-8 rounded-3xl text-center border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registration Approved</h2>
          <p className="text-slate-600 dark:text-slate-400">Your course advisor has formally approved your course list for this semester.</p>
        </div>
      )}

      {/* --- STATE 2: PENDING --- */}
      {status === "pending" && (
        <div className="glass-panel p-8 rounded-3xl text-center border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
          <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pending Advisor Approval</h2>
          <p className="text-slate-600 dark:text-slate-400">You have successfully submitted your course list. It is currently locked while waiting for your Course Advisor's review.</p>
        </div>
      )}

      {/* --- STATE 3: CLOSED BY ADVISOR --- */}
      {status === "unregistered" && !isOpen && (
        <div className="glass-panel p-8 rounded-3xl text-center border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registration Locked</h2>
          <p className="text-slate-600 dark:text-slate-400">Your Course Advisor has not opened registration for your series yet. Please check back later.</p>
        </div>
      )}

      {/* --- STATE 4: OPEN & READY TO FILL --- */}
      {status === "unregistered" && isOpen && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-ruet-blue/10 dark:bg-ruet-gold/10 p-4 rounded-xl border border-ruet-blue/20 dark:border-ruet-gold/20">
            <AlertCircle className="text-ruet-blue dark:text-ruet-gold shrink-0" size={20} />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Registration is OPEN. {deadline ? `The hard deadline is ${new Date(deadline).toLocaleDateString()}.` : "Please submit your courses promptly."}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-ruet-blue dark:text-ruet-gold"/> Mandatory Core Courses
            </h3>
            
            <div className="space-y-3">
              {coreCourses.map((course: any) => (
                <div key={course._id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20 opacity-80 cursor-not-allowed">
                  <input type="checkbox" checked disabled className="h-5 w-5 rounded text-ruet-blue" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">{course.courseCode}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{course.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700 dark:text-slate-300">{course.credits} Cr</p>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 dark:bg-white/10 px-2 py-0.5 rounded">
                      {course.isProject ? "Project" : course.isSessional ? "Lab" : "Theory"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {electiveCourses.length > 0 && (
              <>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-10 mb-6 border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-purple-500"/> Elective Courses
                </h3>
                <div className="space-y-3">
                  {electiveCourses.map((course: any) => {
                    const isSelected = selectedElectives.has(course._id);
                    return (
                      <label key={course._id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? "border-purple-500 bg-purple-50 dark:bg-purple-500/10 dark:border-purple-500/50 shadow-md" : "border-slate-200 bg-white hover:border-purple-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-purple-500/30"}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected} 
                          onChange={() => handleToggleElective(course._id)}
                          className="h-5 w-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" 
                        />
                        <div className="flex-1">
                          <p className={`font-bold ${isSelected ? "text-purple-900 dark:text-purple-100" : "text-slate-900 dark:text-white"}`}>{course.courseCode}</p>
                          <p className={`text-sm ${isSelected ? "text-purple-700 dark:text-purple-300" : "text-slate-500 dark:text-slate-400"}`}>{course.title}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-700 dark:text-slate-300">{course.credits} Cr</p>
                          <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-100 dark:bg-purple-500/20 dark:text-purple-300 px-2 py-0.5 rounded">Elective</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </>
            )}

            {/* Total Footer & Submit */}
            <div className="mt-10 p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 dark:bg-white/5 border dark:border-white/10">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Registered Credits</p>
                <p className="text-4xl font-black">{totalCredits.toFixed(2)} <span className="text-lg text-slate-500 font-normal">Cr</span></p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-4 bg-ruet-blue hover:bg-blue-800 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-xl"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                Submit to Advisor
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}