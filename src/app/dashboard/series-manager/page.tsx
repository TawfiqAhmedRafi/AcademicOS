"use client";

import { useState, useEffect } from "react";
import {
  Network,
  Plus,
  Users,
  GraduationCap,
  ChevronRight,
  Loader2,
  X,
  AlertCircle,
  Award,
  Upload
} from "lucide-react";
import DropdownFilter from "../../components/DropdownFilter";
import { useToast } from "../../components/ToastProvider";
import Swal from "sweetalert2";

type Advisor = { email: string; name: string };
type Series = {
  _id: string;
  series: string;
  currentSemester: string;
  status: string;
  advisor1?: Advisor | null;
  advisor2?: Advisor | null;
  registration: { isOpen: boolean; deadline: string | null };
};
type Faculty = {
  _id: string;
  name: string;
  email: string;
};

const semesterOptions = [
  { label: "Semester 1-1", value: "1-1" },
  { label: "Semester 1-2", value: "1-2" },
  { label: "Semester 2-1", value: "2-1" },
  { label: "Semester 2-2", value: "2-2" },
  { label: "Semester 3-1", value: "3-1" },
  { label: "Semester 3-2", value: "3-2" },
  { label: "Semester 4-1", value: "4-1" },
  { label: "Semester 4-2", value: "4-2" },
];

export default function SeriesManagerPage() {
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [newSeriesSem, setNewSeriesSem] = useState("1-1");
  const [file, setFile] = useState<File | null>(null); // <-- NEW
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const fetchData = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const [resSeries, resFac] = await Promise.all([
      fetch("/api/head/series"),
      fetch("/api/head/faculty-list"),
    ]);

    if (resSeries.ok && resFac.ok) {
      setSeriesList(await resSeries.json());
      setFacultyList(await resFac.json());
    }
    if (showLoader) setIsLoading(false);
  };

  useEffect(() => {
    fetchData(true); 
  }, []);

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      showToast("Please upload the student list Excel file.", "error");
      return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("series", newSeriesName);
    formData.append("currentSemester", newSeriesSem);
    formData.append("file", file);

    const res = await fetch("/api/head/series", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setIsAddModalOpen(false);
      setNewSeriesName("");
      setNewSeriesSem("1-1");
      setFile(null);
      showToast(data.message, "success");
      fetchData(false); // Silent refresh
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to create series.", "error");
    }
    setIsSubmitting(false);
  };

  const handleUpdateSemester = async (seriesId: string, seriesName: string, currentSem: string) => {
    const currentIndex = semesterOptions.findIndex((s) => s.value === currentSem);
    const nextSem = semesterOptions[currentIndex + 1]?.value;

    const result = await Swal.fire({
      title: "Promote Series?",
      text: `Promote Series ${seriesName} to Semester ${nextSem}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, promote",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const res = await fetch("/api/head/series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update_semester",
        seriesId,
        payload: { newSemester: nextSem },
      }),
    });
    if (res.ok) fetchData(false);
  };

  const handleGraduateSeries = async (seriesId: string, seriesName: string) => {
    const result = await Swal.fire({
      title: "Graduate Series?",
      text: `Are you sure you want to graduate Series ${seriesName}? This will archive the batch.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, graduate",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    const res = await fetch("/api/head/series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "graduate", seriesId }),
    });
    if (res.ok) fetchData(false); 
  };

  const handleAssignAdvisor = async (seriesId: string, slot: number, email: string) => {
    const faculty = facultyList.find((f) => f.email === email);
    const res = await fetch("/api/head/series", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign_advisor",
        seriesId,
        payload: {
          slot,
          advisorEmail: email === "unassigned" ? null : email,
          advisorName: faculty?.name || null,
        },
      }),
    });
    if (res.ok) fetchData(false);
  };

  const advisorOptions = [
    { label: "Unassigned", value: "unassigned" },
    ...facultyList.map((f) => ({ label: f.name, value: f.email })),
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Series Manager
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Control the global clock for each batch and assign faculty advisors.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-ruet-blue px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
        >
          <Plus size={18} /> Onboard New Series
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
        {isLoading ? (
          <div className="col-span-full flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
          </div>
        ) : seriesList.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/30 py-24 text-center dark:border-white/10 dark:bg-white/5">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
              <Network size={32} />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">No Series Onboarded</h3>
            <p className="max-w-md text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Your department currently has no active batches in the system.
            </p>
          </div>
        ) : (
          seriesList.map((cohort, index) => {
            const currentIndex = semesterOptions.findIndex((s) => s.value === cohort.currentSemester);
            const nextSem = semesterOptions[currentIndex + 1]?.value;

            return (
              <div
                key={cohort._id}
                className="glass-panel relative rounded-3xl p-6 transition-all duration-300 hover:shadow-xl dark:hover:shadow-ruet-gold/5"
                style={{ zIndex: 50 - index }} 
              >
                <div className="mb-6 flex items-start justify-between border-b border-slate-200 pb-6 dark:border-white/10">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">Series {cohort.series}</h2>
                      {cohort.registration.isOpen ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Reg. Open</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-400">Reg. Closed</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 font-mono text-sm font-bold text-ruet-blue dark:text-ruet-gold">
                      <GraduationCap size={16} /> Semester {cohort.currentSemester}
                    </div>
                  </div>

                  {cohort.currentSemester === "4-2" ? (
                    <button
                      onClick={() => handleGraduateSeries(cohort._id, cohort.series)}
                      className="flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-200 dark:bg-ruet-gold/20 dark:text-ruet-gold dark:hover:bg-ruet-gold/30"
                    >
                      <Award size={16} /> Graduate Batch
                    </button>
                  ) : nextSem ? (
                    <button
                      onClick={() => handleUpdateSemester(cohort._id, cohort.series, cohort.currentSemester)}
                      className="flex items-center gap-1 rounded-xl bg-ruet-blue/10 px-4 py-2.5 text-sm font-bold text-ruet-blue transition-colors hover:bg-ruet-blue hover:text-white dark:bg-ruet-gold/10 dark:text-ruet-gold dark:hover:bg-ruet-gold dark:hover:text-black"
                    >
                      Promote to {nextSem} <ChevronRight size={16} />
                    </button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative z-40">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Advisor 1</label>
                    <DropdownFilter
                      icon={<Users size={16} />}
                      options={advisorOptions}
                      value={cohort.advisor1?.email || "unassigned"}
                      onChange={(val) => handleAssignAdvisor(cohort._id, 1, val)}
                    />
                  </div>
                  <div className="relative z-30">
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Advisor 2</label>
                    <DropdownFilter
                      icon={<Users size={16} />}
                      options={advisorOptions}
                      value={cohort.advisor2?.email || "unassigned"}
                      onChange={(val) => handleAssignAdvisor(cohort._id, 2, val)}
                    />
                  </div>
                </div>
                {!cohort.advisor1 && !cohort.advisor2 && (
                  <p className="mt-4 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <AlertCircle size={14} /> Assign at least one advisor to enable operations.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: ADD SERIES & EXCEL UPLOAD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a] animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Onboard New Series</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Series Identifier (e.g., 26)
                </label>
                <input
                  required
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  type="text"
                  className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                  placeholder="26"
                />
              </div>

              <div className="relative z-40">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Starting Semester</label>
                <DropdownFilter
                  icon={<Network size={16} />}
                  options={semesterOptions}
                  value={newSeriesSem}
                  onChange={setNewSeriesSem}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Student List (Excel)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    required
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`w-full rounded-xl border border-dashed ${file ? 'border-ruet-blue bg-ruet-blue/5' : 'border-slate-300 bg-white/50 dark:border-white/20 dark:bg-black/20'} px-4 py-3 flex items-center justify-between transition-colors`}>
                     <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate pr-4">
                       {file ? file.name : "Upload Student XLSX file..."}
                     </span>
                     <Upload size={18} className={file ? "text-ruet-blue" : "text-slate-400"} />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  File must contain columns: <strong>Roll Number</strong> and <strong>Name</strong>. Students will receive an email-based temporary password.
                </p>
              </div>

              <button
                disabled={isSubmitting || !file}
                type="submit"
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 shadow-xl"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Initialize Batch & Provision Accounts"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}