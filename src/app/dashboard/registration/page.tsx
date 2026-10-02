"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, CheckCircle2, Clock, BookOpen, AlertCircle, CreditCard, XCircle, RefreshCcw } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Swal from "sweetalert2";

export default function StudentRegistrationPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>}>
      <RegistrationContent />
    </Suspense>
  );
}

function RegistrationContent() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedElectives, setSelectedElectives] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/student/registration");
    if (res.ok) setData(await res.json());
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Show toast based on payment result from URL params
  useEffect(() => {
    if (paymentStatus === "success") {
      showToast("Payment successful! Your registration has been submitted to your advisor.", "success");
      // Clean the URL without reloading
      window.history.replaceState({}, "", "/dashboard/registration");
    } else if (paymentStatus === "failed") {
      showToast("Payment failed. Please try again.", "error");
    } else if (paymentStatus === "cancelled") {
      showToast("Payment was cancelled. You can try again when ready.", "error");
    }
  }, [paymentStatus]);

  const handleToggleElective = (courseId: string) => {
    const newSet = new Set(selectedElectives);
    if (newSet.has(courseId)) newSet.delete(courseId);
    else newSet.add(courseId);
    setSelectedElectives(newSet);
  };

  const handleProceedToPayment = async () => {
    const mandatoryIds = data.courses.filter((c: any) => !c.isElective).map((c: any) => c._id);
    const finalSelection = [...mandatoryIds, ...Array.from(selectedElectives)];

    // Calculate total credits for confirmation dialog
    const selectedCourses = data.courses.filter((c: any) => finalSelection.includes(c._id));
    const totalCredits = selectedCourses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);
    const amount = (totalCredits * 20).toFixed(2);

    const result = await Swal.fire({
      title: "Proceed to Payment?",
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.8;">
          <p><strong>Total Credits:</strong> ${totalCredits.toFixed(2)}</p>
          <p><strong>Fee:</strong> ৳${amount} <span style="color: #888;">(${totalCredits.toFixed(2)} credits × ৳20)</span></p>
          <hr style="margin: 12px 0; border-color: #eee;">
          <p style="color: #666;">You will be redirected to the SSLCommerz payment gateway. Your registration will only be submitted to your advisor after a successful payment.</p>
        </div>
      `,
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Pay Now",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#002B49",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedCourseIds: finalSelection }),
      });

      const responseData = await res.json();

      if (res.ok && responseData.GatewayPageURL) {
        // Redirect to SSLCommerz payment gateway
        window.location.href = responseData.GatewayPageURL;
      } else {
        showToast(responseData.error || "Failed to initiate payment", "error");
        setIsSubmitting(false);
      }
    } catch (error) {
      showToast("Something went wrong. Please try again.", "error");
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;
  if (!data) return <div className="p-8 text-center text-red-500 font-bold">Failed to load registration data.</div>;

  const { status, seriesConfig, courses, registeredCourses, academicHistory, allCourses } = data;
  const isOpen = seriesConfig?.registration?.isOpen;
  const deadline = seriesConfig?.registration?.deadline;

  // --- Check if the current semester is already archived in their history ---
  const isCompleted = academicHistory?.some((h: any) => h.semester === seriesConfig?.currentSemester);

  const coreCourses = courses.filter((c: any) => !c.isElective);
  const electiveCourses = courses.filter((c: any) => c.isElective);

  const coreCredits = coreCourses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);
  const electiveCredits = electiveCourses
    .filter((c: any) => selectedElectives.has(c._id))
    .reduce((sum: number, c: any) => sum + (c.credits || 0), 0);
  const totalCredits = coreCredits + electiveCredits;

  const submittedCourses = courses.filter((c: any) => (registeredCourses || []).includes(c._id));
  const submittedCredits = submittedCourses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Course Registration</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Semester {seriesConfig?.currentSemester} | Series {seriesConfig?.series}
        </p>
      </div>

      {/* --- Payment Failure / Cancellation Banner --- */}
      {(paymentStatus === "failed" || paymentStatus === "cancelled") && status === "unregistered" && (
        <div className={`mb-6 flex items-center gap-3 p-4 rounded-xl border ${
          paymentStatus === "failed" 
            ? "bg-red-50/80 border-red-200 dark:bg-red-500/10 dark:border-red-500/30" 
            : "bg-amber-50/80 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
        }`}>
          {paymentStatus === "failed" 
            ? <XCircle className="text-red-500 shrink-0" size={22} /> 
            : <AlertCircle className="text-amber-500 shrink-0" size={22} />
          }
          <div className="flex-1">
            <p className={`text-sm font-bold ${paymentStatus === "failed" ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"}`}>
              {paymentStatus === "failed" 
                ? "Payment Failed — Your transaction could not be completed." 
                : "Payment Cancelled — You cancelled the payment process."
              }
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Your course selection is still intact. You can try the payment again below.
            </p>
          </div>
          <button 
            onClick={() => window.history.replaceState({}, "", "/dashboard/registration")} 
            className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {isCompleted ? (
        <div className="glass-panel p-8 rounded-3xl text-center border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 mb-8">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Semester Completed</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Your official results for Semester {seriesConfig.currentSemester} have been published. Please wait for your Department Head to promote your batch to the next semester.
          </p>
        </div>
      ) : (status === "approved" || status === "pending") ? (
        <div className="space-y-6">
          <div className={`glass-panel p-8 rounded-3xl text-center border ${status === "approved" ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5"}`}>
            {status === "approved" ? <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" /> : <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {status === "approved" ? "Registration Approved" : "Pending Advisor Approval"}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              {status === "approved" ? "Your course advisor has formally approved your course list for this semester." : "Payment was successful and your course list has been submitted. It is currently locked while waiting for your Course Advisor's review."}
            </p>
          </div>

          <div className="glass-panel rounded-3xl p-6 md:p-8">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
               <BookOpen size={20} className="text-ruet-blue dark:text-ruet-gold"/> Submitted Courses
             </h3>
             <div className="space-y-3">
               {submittedCourses.map((course: any) => (
                 <div key={course._id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                   <div className="flex flex-shrink-0 h-10 w-10 items-center justify-center rounded-lg bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold"><CheckCircle2 size={20} /></div>
                   <div className="flex-1">
                     <p className="font-bold text-slate-900 dark:text-white">{course.courseCode}</p>
                     <p className="text-sm text-slate-500 dark:text-slate-400">{course.title}</p>
                   </div>
                   <div className="text-right">
                     <p className="font-bold text-slate-700 dark:text-slate-300">{course.credits} Cr</p>
                     <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${course.isElective ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>
                        {course.isElective ? "Elective" : course.isProject ? "Project" : course.isSessional ? "Lab" : "Theory"}
                     </span>
                   </div>
                 </div>
               ))}
             </div>
             <div className="mt-8 flex justify-end items-end gap-6 border-t border-slate-200 dark:border-white/10 pt-6">
                <div className="text-right">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Registered Credits</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{submittedCredits.toFixed(2)}</p>
                </div>
             </div>
          </div>
        </div>
      ) : (status === "unregistered" && !isOpen) ? (
        <div className="glass-panel p-8 rounded-3xl text-center border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registration Locked</h2>
          <p className="text-slate-600 dark:text-slate-400">Your Course Advisor has not opened registration for your series yet. Please check back later.</p>
        </div>
      ) : (status === "unregistered" && isOpen) ? (
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
                        <input type="checkbox" checked={isSelected} onChange={() => handleToggleElective(course._id)} className="h-5 w-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer" />
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
            <div className="mt-10 p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 dark:bg-white/5 border dark:border-white/10">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Registered Credits</p>
                <p className="text-4xl font-black">{totalCredits.toFixed(2)} <span className="text-lg text-slate-500 font-normal">Cr</span></p>
                <p className="text-sm text-slate-400 mt-1">Fee: ৳{(totalCredits * 20).toFixed(2)} <span className="text-xs">({totalCredits.toFixed(2)} × ৳20)</span></p>
              </div>
              <button onClick={handleProceedToPayment} disabled={isSubmitting} className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-xl">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />} Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- NEW: HISTORY LOG (TABLE FORMAT) --- */}
      {academicHistory && academicHistory.length > 0 && (
        <div className="mt-12 animate-in fade-in duration-700">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-slate-400 dark:text-slate-500"/> Past Registrations
          </h3>
          <div className="space-y-8">
            {academicHistory.sort((a:any, b:any) => b.semester.localeCompare(a.semester)).map((hist: any, idx: number) => (
               <div key={idx} className="glass-panel overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                 <div className="bg-slate-50 dark:bg-white/5 px-6 py-4 border-b border-slate-200 dark:border-white/10">
                   <h4 className="text-lg font-bold text-slate-900 dark:text-white">Semester {hist.semester}</h4>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm whitespace-nowrap">
                     <thead className="bg-[#002B49] text-white dark:bg-ruet-blue">
                       <tr>
                         <th className="px-4 py-3 font-semibold text-center w-16 border-r border-white/20">Sl.</th>
                         <th className="px-4 py-3 font-semibold border-r border-white/20">Course Code</th>
                         <th className="px-4 py-3 font-semibold border-r border-white/20">Course Title</th>
                         <th className="px-4 py-3 font-semibold text-center border-r border-white/20">Credit</th>
                         <th className="px-4 py-3 font-semibold text-center">Registration</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-200 dark:divide-white/10 bg-white dark:bg-transparent">
                       {hist.courses.map((c: any, i: number) => {
                          const code = typeof c === 'string' ? c : c.courseCode;
                          
                          // --- MATCH TITLE FROM CATALOG ---
                          const catalogMatch = allCourses?.find((cat: any) => cat.courseCode === code);
                          const title = catalogMatch?.title || c.title || "Archived Course Record"; 
                          const credits = catalogMatch?.credits ? catalogMatch.credits.toFixed(2) : (c.credits ? c.credits.toFixed(2) : "-");
                          
                          return (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                              <td className="px-4 py-3 text-center text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-white/10">{i + 1}.</td>
                              <td className="px-4 py-3 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/10">{code}</td>
                              <td className="px-4 py-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-white/10">{title}</td>
                              <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-white/10">{credits}</td>
                              <td className="px-4 py-3 text-center font-bold text-ruet-blue dark:text-ruet-gold">Yes</td>
                            </tr>
                          )
                       })}
                     </tbody>
                   </table>
                 </div>
               </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}