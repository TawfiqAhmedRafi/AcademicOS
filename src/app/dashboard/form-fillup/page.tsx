"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Lock,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  FileText,
  BookOpen,
} from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import Link from "next/link";
import Swal from "sweetalert2";

export default function StudentFormFillupPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/student/form-fillup");
    if (res.ok) {
      setData(await res.json());
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Are you sure you want to submit your Exam Form Fill-up?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Submit",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);

    const res = await fetch("/api/student/form-fillup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
      showToast("Form Fill-up submitted successfully", "success");
      fetchData(); // Refresh to show pending state
    } else {
      showToast("Failed to submit Form Fill-up", "error");
    }
    setIsSubmitting(false);
  };

  if (isLoading)
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2
          className="animate-spin text-ruet-blue dark:text-ruet-gold"
          size={32}
        />
      </div>
    );
  if (!data)
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Failed to load Form Fill-up data.
      </div>
    );

  const { registrationStatus, formFillupStatus, seriesConfig, courses } = data;
  const isOpen = seriesConfig?.formFillup?.isOpen;
  const deadline = seriesConfig?.formFillup?.deadline;

  const totalCredits = courses.reduce(
    (sum: number, c: any) => sum + (c.credits || 0),
    0,
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Exam Form Fill-up
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Semester {seriesConfig?.currentSemester} | Series{" "}
          {seriesConfig?.series}
        </p>
      </div>

      {/* --- GATE 1: REGISTRATION NOT APPROVED --- */}
      {registrationStatus !== "approved" && (
        <div className="glass-panel p-8 rounded-3xl text-center border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <Lock className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Prerequisite Required
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You must have an approved Course Registration before you can access
            the Semester Final Form Fill-up.
          </p>
          <Link
            href="/dashboard/registration"
            className="inline-flex items-center justify-center rounded-xl bg-ruet-blue px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
          >
            Go to Course Registration
          </Link>
        </div>
      )}

      {/* --- GATE 2: REGISTRATION APPROVED, BUT MODULE IS WORKING --- */}
      {registrationStatus === "approved" && (
        <>
          {/* STATE 1: APPROVED */}
          {formFillupStatus === "approved" && (
            <div className="glass-panel p-8 rounded-3xl text-center border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Form Fill-up Approved
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Your Exam Form Fill-up has been formally approved. You are
                cleared for the Semester Final Examinations.
              </p>
            </div>
          )}

          {/* STATE 2: PENDING */}
          {formFillupStatus === "pending" && (
            <div className="glass-panel p-8 rounded-3xl text-center border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
              <Clock className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Pending Advisor Approval
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                You have successfully submitted your Form Fill-up request. It is
                currently waiting for your Course Advisor&apos;s review.
              </p>
            </div>
          )}

          {/* STATE 3: CLOSED BY ADVISOR */}
          {formFillupStatus === "unregistered" && !isOpen && (
            <div className="glass-panel p-8 rounded-3xl text-center border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
              <Lock className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Form Fill-up Locked
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Your Course Advisor has not opened the Form Fill-up window for
                your series yet. Please check back later.
              </p>
            </div>
          )}

          {/* STATE 4: OPEN & READY TO FILL */}
          {formFillupStatus === "unregistered" && isOpen && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 bg-emerald-500/10 dark:bg-emerald-500/20 p-4 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30">
                <AlertCircle
                  className="text-emerald-600 dark:text-emerald-400 shrink-0"
                  size={20}
                />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Form Fill-up is OPEN.{" "}
                  {deadline
                    ? `The hard deadline is ${new Date(deadline).toLocaleDateString()}.`
                    : "Please verify your approved courses and submit."}
                </p>
              </div>

              <div className="glass-panel rounded-3xl p-6 md:p-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 border-b border-slate-200 dark:border-white/10 pb-4 flex items-center gap-2">
                  <FileText
                    size={20}
                    className="text-emerald-500 dark:text-emerald-400"
                  />{" "}
                  Approved Exam Courses
                </h3>

                <div className="space-y-3">
                  {courses.length === 0 ? (
                    <p className="text-slate-500 italic">
                      No courses found for this registration.
                    </p>
                  ) : (
                    courses.map((course: any) => (
                      <div
                        key={course._id}
                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20"
                      >
                        <div className="flex flex-shrink-0 h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                          <CheckCircle2 size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {course.courseCode}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {course.title}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-700 dark:text-slate-300">
                            {course.credits} Cr
                          </p>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${course.isElective ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}
                          >
                            {course.isElective
                              ? "Elective"
                              : course.isProject
                                ? "Project"
                                : course.isSessional
                                  ? "Lab"
                                  : "Theory"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total Footer & Submit */}
                <div className="mt-10 p-6 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 dark:bg-white/5 border dark:border-white/10">
                  <div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">
                      Cleared Exam Credits
                    </p>
                    <p className="text-4xl font-black">
                      {totalCredits.toFixed(2)}{" "}
                      <span className="text-lg text-slate-500 font-normal">
                        Cr
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || courses.length === 0}
                    className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-70 shadow-xl"
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <Send size={20} />
                    )}
                    Submit Exam Form
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
