"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, CheckCircle2, Clock, AlertCircle, CreditCard, FileText, BookOpen, XCircle } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Link from "next/link";
import Swal from "sweetalert2";

export default function StudentFormFillupPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>}>
      <FormFillupContent />
    </Suspense>
  );
}

function FormFillupContent() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/student/form-fillup");
    if (res.ok) setData(await res.json());
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Show toast based on payment result from URL params
  useEffect(() => {
    if (paymentStatus === "success") {
      showToast("Payment successful! Your form fill-up has been submitted to your advisor.", "success");
      window.history.replaceState({}, "", "/dashboard/form-fillup");
    } else if (paymentStatus === "failed") {
      showToast("Payment failed. Please try again.", "error");
    } else if (paymentStatus === "cancelled") {
      showToast("Payment was cancelled. You can try again when ready.", "error");
    }
  }, [paymentStatus]);

  const handleProceedToPayment = async () => {
    const totalCredits = data.courses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);
    const amount = (totalCredits * 20).toFixed(2);

    const result = await Swal.fire({
      title: "Proceed to Payment?",
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.8;">
          <p><strong>Total Credits:</strong> ${totalCredits.toFixed(2)}</p>
          <p><strong>Fee:</strong> ৳${amount} <span style="color: #888;">(${totalCredits.toFixed(2)} credits × ৳20)</span></p>
          <hr style="margin: 12px 0; border-color: #eee;">
          <p style="color: #666;">You will be redirected to the SSLCommerz payment gateway. Your form fill-up will only be submitted to your advisor after a successful payment.</p>
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
      const res = await fetch("/api/payment/form-fillup/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const responseData = await res.json();

      if (res.ok && responseData.GatewayPageURL) {
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
  if (!data) return <div className="p-8 text-center text-red-500 font-bold">Failed to load Form Fill-up data.</div>;

  const { registrationStatus, formFillupStatus, seriesConfig, courses, academicHistory, allCourses } = data;
  const isOpen = seriesConfig?.formFillup?.isOpen;
  const deadline = seriesConfig?.formFillup?.deadline;

  // --- Check if the current semester is already archived in their history ---
  const isCompleted = academicHistory?.some((h: any) => h.semester === seriesConfig?.currentSemester);
  const totalCredits = courses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Exam Form Fill-up</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Semester {seriesConfig?.currentSemester} | Series {seriesConfig?.series}
        </p>
      </div>

      {/* --- Payment Failure / Cancellation Banner --- */}
      {(paymentStatus === "failed" || paymentStatus === "cancelled") && formFillupStatus === "unregistered" && (
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
              You can try the payment again below.
            </p>
          </div>
          <button 
            onClick={() => window.history.replaceState({}, "", "/dashboard/form-fillup")} 
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
            Your official results for Semester {seriesConfig.currentSemester} have been published. Your form fill-up records are securely archived below.
          </p>
        </div>
      ) : registrationStatus !== "approved" ? (
        <div className="glass-panel p-8 rounded-3xl text-center border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <Lock className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Prerequisite Required</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You must have an approved Course Registration before you can access the Semester Final Form Fill-up.
          </p>
          <Link href="/dashboard/registration" className="inline-flex items-center justify-center rounded-xl bg-ruet-blue px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
            Go to Course Registration
          </Link>
        </div>
      ) : (formFillupStatus === "approved" || formFillupStatus === "pending") ? (
        <div className="space-y-6">
           <div className={`glass-panel p-8 rounded-3xl text-center border ${formFillupStatus === "approved" ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5"}`}>
             {formFillupStatus === "approved" ? <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" /> : <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />}
             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
               {formFillupStatus === "approved" ? "Form Fill-up Approved" : "Pending Advisor Approval"}
             </h2>
             <p className="text-slate-600 dark:text-slate-400">
               {formFillupStatus === "approved" ? "Your Exam Form Fill-up has been formally approved." : "Payment was successful and your Form Fill-up request has been submitted. It is currently waiting for your Course Advisor's review."}
             </p>
           </div>

           <div className="glass-panel rounded-3xl p-6 md:p-8">
             <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
               <FileText size={20} className="text-emerald-500 dark:text-emerald-400" /> Cleared Exam Courses
             </h3>
             <div className="space-y-3">
               {courses.map((course: any) => (
                 <div key={course._id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                   <div className="flex flex-shrink-0 h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"><CheckCircle2 size={20} /></div>
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
           </div>
        </div>
      ) : (formFillupStatus === "unregistered" && !isOpen) ? (
        <div className="glass-panel p-8 rounded-3xl text-center border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Form Fill-up Locked</h2>
          <p className="text-slate-600 dark:text-slate-400">Your Course Advisor has not opened the Form Fill-up window for your series yet.</p>
        </div>
      ) : (formFillupStatus === "unregistered" && isOpen) ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-emerald-500/10 dark:bg-emerald-500/20 p-4 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30">
            <AlertCircle className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Form Fill-up is OPEN. {deadline ? `The hard deadline is ${new Date(deadline).toLocaleDateString()}.` : "Please verify your approved courses and submit."}
            </p>
          </div>
          <div className="glass-panel rounded-3xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
              <FileText size={20} className="text-emerald-500 dark:text-emerald-400" /> Approved Exam Courses
            </h3>
            <div className="space-y-3">
              {courses.map((course: any) => (
                <div key={course._id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
                  <input type="checkbox" checked disabled className="h-5 w-5 rounded text-emerald-500" />
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
            <div className="mt-10 p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 dark:bg-white/5 border dark:border-white/10">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total Exam Credits</p>
                <p className="text-4xl font-black">{totalCredits.toFixed(2)} <span className="text-lg text-slate-500 font-normal">Cr</span></p>
                <p className="text-sm text-slate-400 mt-1">Fee: ৳{(totalCredits * 20).toFixed(2)} <span className="text-xs">({totalCredits.toFixed(2)} × ৳20)</span></p>
              </div>
              <button onClick={handleProceedToPayment} disabled={isSubmitting || courses.length === 0} className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-xl">
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
            <BookOpen size={20} className="text-slate-400 dark:text-slate-500"/> Past Fill-ups
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
                         <th className="px-4 py-3 font-semibold text-center">Form Fillup</th>
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
                              <td className="px-4 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">Yes</td>
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