"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  Users,
  CalendarDays,
  CheckSquare,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  CheckCheck,
  FileText,
  BookOpen,
  AlertCircle // <-- Make sure AlertCircle is imported!
} from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import DropdownFilter from "@/app/components/DropdownFilter";
import Swal from "sweetalert2";

type SeriesConfig = {
  _id: string;
  series: string;
  currentSemester: string;
  registration: { isOpen: boolean; deadline: string | null };
  formFillup?: { isOpen: boolean; deadline: string | null };
  backlogRegistration?: { isOpen: boolean; deadline: string | null };
};

type Student = {
  _id: string;
  name: string;
  email: string;
  series: string;
  studentId?: string;
  registrationStatus?: "unregistered" | "pending" | "approved";
  formFillupStatus?: "unregistered" | "pending" | "approved";
};

export default function SeriesRosterPage() {
  const [seriesData, setSeriesData] = useState<SeriesConfig[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeSeries, setActiveSeries] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkApproving, setIsBulkApproving] = useState<{
    reg: boolean;
    ff: boolean;
  }>({ reg: false, ff: false });

  // Filter States
  const [regFilter, setRegFilter] = useState("all");
  const [ffFilter, setFfFilter] = useState("all");

  const { showToast } = useToast();

  const fetchData = async (showSpinner = true) => {
    if (showSpinner) setIsLoading(true);
    const res = await fetch("/api/advisor/roster");
    if (res.ok) {
      const data = await res.json();
      setSeriesData(data.seriesData);
      setStudents(data.students);
      if (data.seriesData.length > 0 && !activeSeries) {
        setActiveSeries(data.seriesData[0].series);
      }
    }
    if (showSpinner) setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (
    series: string,
    action: string,
    payload: any = {},
  ) => {
    const res = await fetch("/api/advisor/roster", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series, action, payload }),
    });
    if (res.ok) {
      showToast("Updated successfully", "success");
      fetchData(false);
    } else {
      showToast("Failed to update", "error");
    }
  };

  const handleBulkApprove = async (series: string, type: "reg" | "ff") => {
    const action = type === "reg" ? "bulk_approve_reg" : "bulk_approve_ff";
    const label = type === "reg" ? "Course Registrations" : "Form Fill-ups";

    const result = await Swal.fire({
      title: "Approve All?",
      text: `Are you sure you want to approve ALL pending ${label} for Series ${series}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, approve all",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setIsBulkApproving((prev) => ({ ...prev, [type]: true }));
    await handleAction(series, action);
    setIsBulkApproving((prev) => ({ ...prev, [type]: false }));
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
  if (seriesData.length === 0)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
        <Users className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          No Series Assigned
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          You are not currently assigned as an advisor for any active series.
        </p>
      </div>
    );

  const activeConfig = seriesData.find((s) => s.series === activeSeries);
  const formFillup = activeConfig?.formFillup || {
    isOpen: false,
    deadline: null,
  };

  // Extract roll and sort
  const activeStudents = students
    .filter((s) => s.series === activeSeries)
    .sort((a, b) => {
      const rollA = a.studentId || a.email.split("@")[0];
      const rollB = b.studentId || b.email.split("@")[0];
      return rollA.localeCompare(rollB, undefined, { numeric: true });
    });

  // Client-side filtering logic
  const filteredStudents = activeStudents.filter((student) => {
    const matchReg =
      regFilter === "all" ||
      (student.registrationStatus || "unregistered") === regFilter;
    const matchFf =
      ffFilter === "all" ||
      (student.formFillupStatus || "unregistered") === ffFilter;
    return matchReg && matchFf;
  });

  const pendingRegCount = activeStudents.filter(
    (s) => s.registrationStatus === "pending",
  ).length;
  const pendingFFCount = activeStudents.filter(
    (s) => s.formFillupStatus === "pending",
  ).length;

  const getStatusBadge = (status?: string) => {
    if (status === "approved")
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 size={12} /> Approved
        </span>
      );
    if (status === "pending")
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
          <Clock size={12} /> Pending
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-white/10 dark:text-slate-400">
        <XCircle size={12} /> Unregistered
      </span>
    );
  };

  // Dropdown options
  const regOptions = [
    { label: "Course Reg: All", value: "all" },
    { label: "Approved", value: "approved" },
    { label: "Pending", value: "pending" },
    { label: "Unregistered", value: "unregistered" },
  ];

  const ffOptions = [
    { label: "Form Fill: All", value: "all" },
    { label: "Approved", value: "approved" },
    { label: "Pending", value: "pending" },
    { label: "Unregistered", value: "unregistered" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Series Master Roster
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Control lifecycle events and track student submissions.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 custom-scrollbar">
        {seriesData.map((cfg) => (
          <button
            key={cfg.series}
            onClick={() => {
              setActiveSeries(cfg.series);
              setRegFilter("all"); // Reset filters on tab change
              setFfFilter("all");
            }}
            className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeSeries === cfg.series
                ? "bg-ruet-blue text-white shadow-md dark:bg-ruet-gold dark:text-black"
                : "bg-white/50 text-slate-600 hover:bg-white/80 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            Series {cfg.series}{" "}
            <span className="ml-2 opacity-70 font-normal">
              Sem {cfg.currentSemester}
            </span>
          </button>
        ))}
      </div>

      {activeConfig && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Course Registration Control Box */}
            <div className="glass-panel rounded-3xl p-6 border-l-4 border-l-ruet-blue dark:border-l-ruet-gold flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">
                    <BookOpen size={16} /> Course Registration
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${activeConfig.registration.isOpen ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                  >
                    {activeConfig.registration.isOpen ? "OPEN" : "LOCKED"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Deadline:
                  </span>
                  <input
                    type="date"
                    value={activeConfig.registration.deadline || ""}
                    onChange={(e) =>
                      handleAction(activeConfig.series, "set_deadline", {
                        deadline: e.target.value,
                      })
                    }
                    className="flex-1 rounded-lg border border-slate-300 bg-white/50 px-3 py-1.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={() =>
                  handleAction(activeConfig.series, "toggle_registration", {
                    isOpen: !activeConfig.registration.isOpen,
                  })
                }
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  activeConfig.registration.isOpen
                    ? "bg-white text-red-600 hover:bg-red-50 border border-red-200 dark:bg-transparent dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    : "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
                }`}
              >
                {activeConfig.registration.isOpen
                  ? "Lock Course Registration"
                  : "Open Course Registration"}
              </button>
            </div>

            {/* Form Fill-up Control Box */}
            <div className="glass-panel rounded-3xl p-6 border-l-4 border-l-emerald-500 dark:border-l-emerald-400 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">
                    <FileText size={16} /> Exam Form Fill-up
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${formFillup.isOpen ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}
                  >
                    {formFillup.isOpen ? "OPEN" : "LOCKED"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Deadline:
                  </span>
                  <input
                    type="date"
                    value={formFillup.deadline || ""}
                    onChange={(e) =>
                      handleAction(
                        activeConfig.series,
                        "set_form_fillup_deadline",
                        { deadline: e.target.value },
                      )
                    }
                    className="flex-1 rounded-lg border border-slate-300 bg-white/50 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={() =>
                  handleAction(activeConfig.series, "toggle_form_fillup", {
                    isOpen: !formFillup.isOpen,
                  })
                }
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  formFillup.isOpen
                    ? "bg-white text-red-600 hover:bg-red-50 border border-red-200 dark:bg-transparent dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-white dark:hover:bg-emerald-600"
                }`}
              >
                {formFillup.isOpen ? "Lock Form Fill-up" : "Open Form Fill-up"}
              </button>
            </div>

            {/* Backlog Registration Control Box */}
            <div className="glass-panel rounded-3xl p-6 border-l-4 border-l-amber-500 dark:border-l-amber-400 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">
                    <AlertCircle size={16} /> Backlog Exams
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black ${activeConfig.backlogRegistration?.isOpen ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"}`}>
                    {activeConfig.backlogRegistration?.isOpen ? "OPEN" : "LOCKED"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Deadline:</span>
                  <input 
                    type="date" 
                    value={activeConfig.backlogRegistration?.deadline || ""}
                    onChange={(e) => handleAction(activeConfig.series, "set_backlog_deadline", { deadline: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-300 bg-white/50 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={() => handleAction(activeConfig.series, "toggle_backlog_registration", { isOpen: !activeConfig.backlogRegistration?.isOpen })}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-sm ${
                  activeConfig.backlogRegistration?.isOpen
                    ? "bg-white text-red-600 hover:bg-red-50 border border-red-200 dark:bg-transparent dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
                    : "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                }`}
              >
                {activeConfig.backlogRegistration?.isOpen ? "Lock Backlogs" : "Open Backlogs"}
              </button>
            </div>
          </div>

          {/* Master Roster Table */}
          <div className="glass-panel overflow-hidden rounded-3xl">
            <div className="p-5 border-b border-slate-200 dark:border-white/10 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users
                  size={20}
                  className="text-ruet-blue dark:text-ruet-gold"
                />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Student Roster ({filteredStudents.length})
                </h3>
              </div>

              {/* FILTERS */}
              <div className="flex flex-col sm:flex-row gap-3">
                <DropdownFilter
                  icon={<BookOpen size={16} />}
                  options={regOptions}
                  value={regFilter}
                  onChange={setRegFilter}
                />
                <DropdownFilter
                  icon={<FileText size={16} />}
                  options={ffOptions}
                  value={ffFilter}
                  onChange={setFfFilter}
                />
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Roll Number
                    </th>
                    <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                      Student Info
                    </th>

                    {/* Course Registration Column with Bulk Action */}
                    <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300 bg-blue-50/50 dark:bg-blue-900/10 border-l border-white dark:border-slate-800">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wider text-ruet-blue dark:text-blue-400">
                          Course Registration
                        </span>
                        <button
                          onClick={() =>
                            handleBulkApprove(activeConfig.series, "reg")
                          }
                          disabled={
                            pendingRegCount === 0 || isBulkApproving.reg
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-slate-700 transition-colors w-max"
                        >
                          {isBulkApproving.reg ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCheck size={14} />
                          )}
                          Approve All ({pendingRegCount})
                        </button>
                      </div>
                    </th>

                    {/* Form Fill-up Column with Bulk Action */}
                    <th className="px-6 py-3 font-semibold text-slate-600 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-900/10 border-l border-white dark:border-slate-800">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Form Fill-up
                        </span>
                        <button
                          onClick={() =>
                            handleBulkApprove(activeConfig.series, "ff")
                          }
                          disabled={pendingFFCount === 0 || isBulkApproving.ff}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-800 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-slate-700 transition-colors w-max"
                        >
                          {isBulkApproving.ff ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCheck size={14} />
                          )}
                          Approve All ({pendingFFCount})
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-slate-500 dark:text-slate-400"
                      >
                        {activeStudents.length === 0
                          ? "No students have created accounts under this series yet."
                          : "No students match the selected filters."}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const computedRoll =
                        student.studentId || student.email.split("@")[0];
                      return (
                        <tr
                          key={student._id}
                          className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5"
                        >
                          <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">
                            {computedRoll}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {student.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {student.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 border-l border-slate-50 dark:border-white/5 bg-blue-50/10 dark:bg-blue-900/5">
                            {getStatusBadge(student.registrationStatus)}
                          </td>
                          <td className="px-6 py-4 border-l border-slate-50 dark:border-white/5 bg-emerald-50/10 dark:bg-emerald-900/5">
                            {getStatusBadge(student.formFillupStatus)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}