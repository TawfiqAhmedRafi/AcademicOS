"use client";

import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Download,
  Upload,
  CheckCircle2,
  EyeOff,
  FileSpreadsheet,
  AlertCircle,
  Check,
  Filter,
  Lock,
  BookOpen,
  ShieldAlert,
  Layers,
  LayoutGrid,
  Users as UsersIcon
} from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import DropdownFilter from "../../components/DropdownFilter";
import Swal from "sweetalert2";
import { getSegments, getUnifiedColumns } from "@/lib/markSegments";

type UploadMode = "separate" | "unified";
const UPLOAD_MODE_STORAGE_KEY = "aos_marks_upload_mode";
const UNIFIED_SEGMENT = "__unified__";

type MarkCourse = {
  uniqueId: string;
  courseCode: string;
  title: string;
  series: number;
  type: "theory" | "sessional" | "special";
  isSpecial: boolean;
  teacherCount: number;
  completedSegments: string[];
  isXXPending: boolean;
  isLocked: boolean;
  isBacklog?: boolean;
  studentCount?: number;
};

// Dynamic Segments based on Course Code Patterns & Teacher Count
// (shared with the template + upload APIs via @/lib/markSegments)

export default function FacultyMarksDashboard() {
  const [courses, setCourses] = useState<MarkCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<"regular" | "backlog">("regular");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{
    courseCode: string;
    series: number;
    segment: string;
    isBacklog: boolean;
    mode: UploadMode;
    type: string;
    teacherCount: number;
  } | null>(null);

  // Per-course Separate/Unified preference, remembered in the browser
  const [uploadModes, setUploadModes] = useState<Record<string, UploadMode>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(UPLOAD_MODE_STORAGE_KEY);
      if (saved) setUploadModes(JSON.parse(saved));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const getMode = (course: MarkCourse): UploadMode =>
    course.isBacklog ? "separate" : uploadModes[course.uniqueId] || "separate";

  const setMode = (uniqueId: string, mode: UploadMode) => {
    setUploadModes((prev) => {
      const next = { ...prev, [uniqueId]: mode };
      try {
        localStorage.setItem(UPLOAD_MODE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  const { showToast } = useToast();
  const [seriesFilter, setSeriesFilter] = useState("All");

  const uniqueSeries = Array.from(new Set(courses.map((c) => c.series))).sort(
    (a, b) => a - b,
  );
  const seriesOptions = [
    { label: "All Batches", value: "All" },
    ...uniqueSeries.map((s) => ({ label: `Series ${s}`, value: String(s) })),
  ];

  const filteredCourses = courses.filter(
    (c) => seriesFilter === "All" || String(c.series) === seriesFilter,
  );
  const displayCourses =
    activeTab === "regular"
      ? filteredCourses.filter((c) => !c.isBacklog)
      : filteredCourses.filter((c) => c.isBacklog);

  const backlogCount = courses.filter((c) => c.isBacklog).length;

  const fetchCourses = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    const res = await fetch("/api/faculty/marks-dashboard");
    if (res.ok) {
      const data = await res.json();
      setCourses(data.courses || []);
    }
    if (showSpinner) setIsLoading(false);
  };

  useEffect(() => {
    fetchCourses(true);
  }, []);

  const handleHideCourse = async (uniqueId: string) => {
    const result = await Swal.fire({
      title: "Remove course?",
      text: "You should only do this once all your marks are uploaded.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;
    setCourses((prev) => prev.filter((c) => c.uniqueId !== uniqueId));
    await fetch("/api/faculty/marks-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hide", uniqueId }),
    });
    showToast("Course hidden.", "success");
  };

  const handleResolveXX = async (uniqueId: string, value: string) => {
    if (value.length < 5) return;
    showToast("Saving exact course code...", "info");
    const res = await fetch("/api/faculty/marks-dashboard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "resolve_xx",
        uniqueId,
        resolvedCode: value.toUpperCase(),
      }),
    });
    if (res.ok) {
      showToast("Course code locked in!", "success");
      fetchCourses(false);
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to validate code.", "error");
    }
  };

  const handleDownloadDemo = async (course: MarkCourse, segment: string) => {
    showToast(`Generating template for ${course.courseCode}...`, "info");
    const isUnified = segment === UNIFIED_SEGMENT;
    try {
      // Pass the isBacklog flag to ensure the backend filters the Excel rows!
      const url = isUnified
        ? `/api/faculty/template?courseCode=${encodeURIComponent(course.courseCode)}&series=${course.series}&mode=unified&type=${encodeURIComponent(course.type)}&teacherCount=${course.teacherCount}&isBacklog=false`
        : `/api/faculty/template?courseCode=${encodeURIComponent(course.courseCode)}&series=${course.series}&segment=${encodeURIComponent(segment)}&isBacklog=${course.isBacklog ? "true" : "false"}`;
      const res = await fetch(url);
      if (!res.ok)
        throw new Error((await res.text()) || "Failed to generate template");

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${course.courseCode.replace(/\s+/g, "_")}_${course.series}_${isUnified ? "UNIFIED" : segment.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
      showToast(error.message || "Failed to download template.", "error");
    }
  };

  const triggerUploadClick = (course: MarkCourse, segment: string) => {
    setUploadTarget({
      courseCode: course.courseCode,
      series: course.series,
      segment,
      isBacklog: !!course.isBacklog,
      mode: segment === UNIFIED_SEGMENT ? "unified" : "separate",
      type: course.type,
      teacherCount: course.teacherCount,
    });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    setIsUploading(true);
    showToast(`Uploading and processing marks...`, "info");

    const isUnified = uploadTarget.mode === "unified";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseCode", uploadTarget.courseCode);
    formData.append("series", String(uploadTarget.series));
    if (isUnified) {
      formData.append("type", uploadTarget.type);
      formData.append("teacherCount", String(uploadTarget.teacherCount));
    } else {
      formData.append("segment", uploadTarget.segment);
      formData.append("isBacklog", String(uploadTarget.isBacklog));
    }

    try {
      const res = await fetch(
        isUnified ? "/api/faculty/upload-marks-unified" : "/api/faculty/upload-marks",
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      showToast(data.message, "success");
      fetchCourses(false);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setIsUploading(false);
      setUploadTarget(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Marks Upload Portal
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Download Excel templates, input your marks, and upload securely to
            the engine.
          </p>
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

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-white/10 mb-8">
        <button
          onClick={() => setActiveTab("regular")}
          className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === "regular" ? "border-ruet-blue text-ruet-blue dark:border-ruet-gold dark:text-ruet-gold" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
        >
          <BookOpen size={16} /> Regular Schedule
        </button>
        <button
          onClick={() => setActiveTab("backlog")}
          className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === "backlog" ? "border-ruet-blue text-ruet-blue dark:border-ruet-gold dark:text-ruet-gold" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
        >
          <ShieldAlert size={16} /> Backlog Exams
          {backlogCount > 0 && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] dark:bg-amber-500/20 dark:text-amber-400">
              {backlogCount}
            </span>
          )}
        </button>
      </div>

      {displayCourses.length === 0 ? (
        <div className="glass-panel py-24 text-center rounded-3xl flex flex-col items-center">
          <CheckCircle2
            size={48}
            className="text-emerald-500 mb-4 opacity-50"
          />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            All Caught Up!
          </h2>
          <p className="text-slate-500 mt-2">
            You have no pending assignments in this category.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...displayCourses]
            .sort((a, b) => {
              if (a.series !== b.series) return a.series - b.series;
              return a.courseCode.localeCompare(b.courseCode);
            })
            .map((course) => {
              const segments = getSegments(course);
              const mode = getMode(course);
              const unifiedColumns =
                mode === "unified" ? getUnifiedColumns(course) : [];
              const isUnifiedComplete =
                mode === "unified" &&
                segments.every((s) => course.completedSegments.includes(s));

              return (
                <div
                  key={course.uniqueId}
                  className="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg"
                >
                  <div
                    className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 ${course.isBacklog ? "bg-amber-50/50 dark:bg-amber-500/5" : course.isSpecial ? "bg-purple-50/50 dark:bg-purple-500/5" : course.type === "theory" ? "bg-blue-50/50 dark:bg-blue-500/5" : "bg-emerald-50/50 dark:bg-emerald-500/5"}`}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        {course.isXXPending ? (
                          <input
                            type="text"
                            placeholder="Type Exact Code (e.g. ETE 3212)"
                            className="px-2 py-1 text-sm font-bold border border-amber-300 rounded focus:outline-none focus:border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100 placeholder:font-normal"
                            onBlur={(e) =>
                              handleResolveXX(course.uniqueId, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                handleResolveXX(
                                  course.uniqueId,
                                  e.currentTarget.value,
                                );
                            }}
                          />
                        ) : (
                          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {course.courseCode}
                          </h2>
                        )}

                        <span className="bg-slate-900 text-white dark:bg-white dark:text-black px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest">
                          Series {course.series}
                        </span>

                        {course.isBacklog ? (
                          <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <UsersIcon size={10} /> {course.studentCount} Scripts
                          </span>
                        ) : (
                          <span className="bg-slate-200 text-slate-700 dark:bg-white/20 dark:text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            {course.type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 line-clamp-1">
                        {course.title}
                      </p>
                    </div>
                    {!course.isBacklog && (
                      <div className="flex items-center gap-4">
                        {/* Separate / Unified upload mode toggle */}
                        <div
                          role="radiogroup"
                          aria-label="Upload mode"
                          className="flex items-center rounded-xl bg-slate-200/70 dark:bg-white/10 p-1"
                        >
                          {(
                            [
                              { id: "separate", label: "Separate", icon: LayoutGrid },
                              { id: "unified", label: "Unified", icon: Layers },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.id}
                              id={`upload-mode-${opt.id}-${course.uniqueId}`}
                              role="radio"
                              aria-checked={mode === opt.id}
                              onClick={() => setMode(course.uniqueId, opt.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === opt.id ? "bg-white text-slate-900 shadow-sm dark:bg-ruet-gold dark:text-black" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}
                            >
                              <opt.icon size={13} /> {opt.label}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={() => handleHideCourse(course.uniqueId)}
                          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                          <EyeOff size={14} /> Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {course.isXXPending && (
                    <div className="bg-amber-50 dark:bg-amber-500/10 p-3 flex items-center gap-2 border-b border-amber-100 dark:border-amber-500/20">
                      <AlertCircle
                        size={16}
                        className="text-amber-600 dark:text-amber-400"
                      />
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                        Enter exact course code above to unlock uploads. Press
                        Enter to save.
                      </span>
                    </div>
                  )}

                  {course.isLocked && (
                    <div className="bg-red-50 dark:bg-red-500/10 p-3 flex items-center gap-2 border-b border-red-100 dark:border-red-500/20">
                      <Lock
                        size={16}
                        className="text-red-600 dark:text-red-400"
                      />
                      <span className="text-xs font-semibold text-red-800 dark:text-red-200">
                        Tabulation Lockout: The Course Advisor is compiling the
                        draft. Uploads are locked.
                      </span>
                    </div>
                  )}

                  {mode === "unified" ? (
                    <div
                      className={`p-6 ${course.isXXPending ? "opacity-50 pointer-events-none grayscale" : ""}`}
                    >
                      <div
                        className={`rounded-2xl p-5 border transition-colors flex flex-col lg:flex-row lg:items-center gap-5 ${isUnifiedComplete ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/5" : "bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5"}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                              Unified Marks Sheet
                            </h4>
                            {isUnifiedComplete && (
                              <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mb-3">
                            One sheet for every assessment. Attendance is a direct mark.
                            {course.type === "theory" &&
                              (course.teacherCount > 1
                                ? " Best 3 of all 4 CTs (yours + co-teacher's) are averaged; the other half of the final comes from your co-teacher."
                                : " Best 3 of 4 CTs are averaged.")}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900 text-white dark:bg-white dark:text-black">
                              Roll Number
                            </span>
                            {unifiedColumns.map((col) => (
                              <span
                                key={col.header}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${course.completedSegments.includes(col.segment) ? "border-emerald-400/60 text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10" : "border-slate-300 text-slate-600 bg-white dark:border-white/10 dark:text-slate-300 dark:bg-white/5"}`}
                              >
                                {col.header}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:w-56 flex-shrink-0">
                          <button
                            id={`unified-template-${course.uniqueId}`}
                            onClick={() => handleDownloadDemo(course, UNIFIED_SEGMENT)}
                            className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 py-2 rounded-xl text-xs font-bold transition-colors"
                          >
                            <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />{" "}
                            Unified Template
                          </button>
                          <button
                            id={`unified-upload-${course.uniqueId}`}
                            onClick={() => triggerUploadClick(course, UNIFIED_SEGMENT)}
                            disabled={isUploading || course.isLocked}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 ${course.isLocked ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed" : isUnifiedComplete ? "bg-slate-800 text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-200" : "bg-ruet-blue text-white hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"}`}
                          >
                            {isUploading &&
                            uploadTarget?.segment === UNIFIED_SEGMENT &&
                            uploadTarget?.courseCode === course.courseCode ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : course.isLocked ? (
                              <Lock size={14} />
                            ) : isUnifiedComplete ? (
                              <Check size={14} />
                            ) : (
                              <Upload size={14} />
                            )}
                            {course.isLocked
                              ? "Locked"
                              : isUnifiedComplete
                                ? "Update All Marks"
                                : "Upload All Marks"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div
                    className={`p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${course.isXXPending ? "opacity-50 pointer-events-none grayscale" : ""}`}
                  >
                    {segments.map((segment, idx) => {
                      const isCompleted =
                        course.completedSegments.includes(segment);

                      return (
                        <div
                          key={idx}
                          className={`bg-slate-50 dark:bg-black/20 rounded-2xl p-4 border transition-colors flex flex-col justify-between ${isCompleted ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-500/5" : "border-slate-200 dark:border-white/5"}`}
                        >
                          <div className="mb-4 flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">
                                {segment}
                              </h4>
                              {segment === "Attendance" &&
                                !course.isBacklog && (
                                  <p className="text-[10px] text-slate-500">
                                    Template requires Total & Attended.
                                  </p>
                                )}
                            </div>
                            {isCompleted && (
                              <CheckCircle2
                                size={18}
                                className="text-emerald-500 flex-shrink-0"
                              />
                            )}
                          </div>

                          <div className="flex flex-col gap-2 mt-auto">
                            <button
                              onClick={() =>
                                handleDownloadDemo(course, segment)
                              }
                              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 py-2 rounded-xl text-xs font-bold transition-colors"
                            >
                              <FileSpreadsheet
                                size={14}
                                className={
                                  course.isBacklog
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }
                              />{" "}
                              Template
                            </button>

                            <button
                              onClick={() =>
                                triggerUploadClick(course, segment)
                              }
                              disabled={isUploading || course.isLocked}
                              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 ${course.isLocked ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed" : isCompleted ? "bg-slate-800 text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-200" : "bg-ruet-blue text-white hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"}`}
                            >
                              {isUploading &&
                              uploadTarget?.segment === segment &&
                              uploadTarget?.courseCode === course.courseCode ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : course.isLocked ? (
                                <Lock size={14} />
                              ) : isCompleted ? (
                                <Check size={14} />
                              ) : (
                                <Upload size={14} />
                              )}
                              {course.isLocked
                                ? "Locked"
                                : isCompleted
                                  ? "Update Marks"
                                  : "Upload Marks"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
      <input
        type="file"
        accept=".xlsx, .xls"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
