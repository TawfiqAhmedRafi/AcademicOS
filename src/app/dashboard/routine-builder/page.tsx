"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Plus, Calendar, Clock, MapPin, Users, X, Save, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import DropdownFilter from "@/app/components/DropdownFilter";
import Swal from "sweetalert2";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
const TIME_PERIODS = [
  { period: 1, start: "8:00", end: "8:50" }, { period: 2, start: "8:50", end: "9:40" },
  { period: 3, start: "9:40", end: "10:30" }, { period: "BREAK", start: "10:30", end: "10:50", isBreak: true, label: "Break" },
  { period: 4, start: "10:50", end: "11:40" }, { period: 5, start: "11:40", end: "12:30" },
  { period: 6, start: "12:30", end: "1:20" }, { period: "PLB", start: "1:20", end: "2:30", isBreak: true, label: "P&LB" },
  { period: 7, start: "2:30", end: "3:20" }, { period: 8, start: "3:20", end: "4:10" },
  { period: 9, start: "4:10", end: "5:00" },
];
const NUM_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ROOMS = ["301", "302", "303", "304", "Seminar", "DSP Lab", "Electronics Lab", "Communication Lab", "Antenna Lab", "Computer Lab"];
const TYPES = ["theory", "lab", "project", "thesis", "seminar"];
const SPAN3_TYPES = ['lab', 'project', 'seminar', 'thesis'];

export default function RoutineBuilderPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [activeSeries, setActiveSeries] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true); // only for the INITIAL page load

  const [editorModal, setEditorModal] = useState<{ isNew: boolean, data: any } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  // Runs once on mount. This is the ONLY place allowed to toggle the full-page isLoading spinner.
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const [routineRes, facultyRes] = await Promise.all([
        fetch("/api/routine"),
        fetch("/api/head/faculty-list")
      ]);

      if (routineRes.ok) {
        const data = await routineRes.json();
        setConfigs(data.seriesConfigs);
        setSlots(data.slots);
        if (data.seriesConfigs.length > 0) {
          setActiveSeries(Number(data.seriesConfigs[0].series));
        }
      }
      if (facultyRes.ok) {
        setTeachers(await facultyRes.json());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const activeSlots = slots.filter(s => s.series === activeSeries);
  const activeConfig = configs.find(c => Number(c.series) === activeSeries);

  const grid = useMemo(() => {
    const g: any = {};
    DAYS.forEach(d => { g[d] = {}; NUM_PERIODS.forEach(p => { g[d][p] = null; }); });
    const consumed: any = {};

    activeSlots.forEach(slot => {
      const key = `${slot.day}-${slot.startPeriod}`;
      if (!consumed[key]) {
        const spanArr = Array.from({ length: slot.periodSpan || 1 }, (_, i) => slot.startPeriod + i);
        if (g[slot.day]) g[slot.day][slot.startPeriod] = { ...slot, periodSpanArr: spanArr };
        spanArr.slice(1).forEach(p => { consumed[`${slot.day}-${p}`] = true; if (g[slot.day]) g[slot.day][p] = 'CONSUMED'; });
      }
    });
    return g;
  }, [activeSlots]);

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete this class?",
      text: "This class slot will be permanently removed from the routine.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
      background: document.documentElement.classList.contains("dark") ? "#0f172a" : "#ffffff",
      color: document.documentElement.classList.contains("dark") ? "#e2e8f0" : "#0f172a",
    });

    if (!result.isConfirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/routine?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        // Surgical update: drop just this slot from local state, no refetch, no full-page reload.
        setSlots(prev => prev.filter(s => s._id !== id));
        showToast("Slot deleted", "success");
        setEditorModal(null);
      } else {
        showToast("Failed to delete slot", "error");
      }
    } catch {
      showToast("Network error while deleting slot", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSlot = async (payload: any) => {
    const wasNew = !!editorModal?.isNew;
    const method = wasNew ? "POST" : "PUT";

    setIsSaving(true);
    try {
      const res = await fetch("/api/routine", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, series: activeSeries, semester: activeConfig?.currentSemester })
      });

      if (res.ok) {
        const raw = await res.json().catch(() => null);
        // Be flexible about API response shape: { slot: {...} } | { data: {...} } | {...}
        const savedSlot = raw?.slot || raw?.data || raw;

        if (savedSlot && savedSlot._id) {
          setSlots(prev => {
            if (wasNew) return [...prev, savedSlot];
            return prev.map(s => (s._id === savedSlot._id ? savedSlot : s));
          });
        } else {
          // API didn't return the saved slot in a usable shape — do a silent, non-blocking
          // background refresh of just the routine data (no full-page spinner).
          fetch("/api/routine").then(r => r.ok ? r.json() : null).then(data => {
            if (data) { setConfigs(data.seriesConfigs); setSlots(data.slots); }
          });
        }

        showToast(wasNew ? "Slot created" : "Slot updated", "success");
        setEditorModal(null);
      } else {
        showToast("Failed to save slot", "error");
      }
    } catch {
      showToast("Network error while saving slot", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue" size={32} /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Routine Builder</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Click an empty cell to add a class, or click an existing class to edit.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 custom-scrollbar">
        {configs.sort((a,b) => Number(b.series) - Number(a.series)).map(cfg => (
          <button
            key={cfg.series}
            onClick={() => setActiveSeries(Number(cfg.series))}
            className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
              activeSeries === Number(cfg.series)
                ? "bg-ruet-blue text-white shadow-md dark:bg-ruet-gold dark:text-black"
                : "bg-white/50 text-slate-600 hover:bg-white/80 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            Series {cfg.series} <span className="ml-2 opacity-70 font-normal">Sem {cfg.currentSemester}</span>
          </button>
        ))}
      </div>

      {activeSeries && activeConfig && (
        <div className="glass-panel overflow-hidden rounded-3xl animate-in fade-in duration-300">
          <div className="overflow-x-auto custom-scrollbar p-1">
            <table className="w-full text-left text-sm min-w-[900px] table-fixed">
              <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="w-20 px-4 py-4 font-semibold text-slate-600 dark:text-slate-300">DAY</th>
                  {TIME_PERIODS.map(tp => (
                    <th key={tp.period} className="px-2 py-4 text-center border-l border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-500">
                      {tp.isBreak ? <span className="text-amber-500">{tp.label}</span> : `P${tp.period}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {DAYS.map(day => {
                  const consumed: any = {};
                  return (
                    <tr key={day}>
                      <td className="px-4 py-4 font-bold text-slate-900 dark:text-white uppercase text-xs">{day.substring(0,3)}</td>
                      {TIME_PERIODS.map(tp => {
                        if (tp.isBreak) return <td key={tp.period} className="bg-amber-50/50 dark:bg-amber-500/5 border-l border-slate-200 dark:border-white/10" />;
                        if (consumed[tp.period] || grid[day]?.[tp.period] === 'CONSUMED') return null;

                        const slot = grid[day]?.[tp.period];
                        const colSpan = slot ? slot.periodSpanArr.length : 1;
                        if (slot) slot.periodSpanArr.slice(1).forEach((p: number) => consumed[p] = true);

                        return (
                          <td key={tp.period} colSpan={colSpan} className="p-1 border-l border-slate-200 dark:border-white/10">
                            {slot ? (
                              <button
                                onClick={() => setEditorModal({ isNew: false, data: slot })}
                                className="group relative w-full min-h-[4.5rem] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-2 flex flex-col justify-between hover:shadow-md transition-all text-left"
                              >
                                <div className="flex justify-end w-full">
                                  <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded leading-none">{slot.type}</span>
                                </div>
                                <div className="font-black text-emerald-900 dark:text-emerald-300 text-[11px] sm:text-xs leading-tight w-full my-0.5">
                                  {slot.courseCode}
                                </div>
                                <div className="flex justify-between items-end w-full">
                                  <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-500">{slot.teachers?.join(', ')}</span>
                                  {slot.room && <span className="text-[9px] text-emerald-600 dark:text-emerald-500 font-medium ml-2">{slot.room}</span>}
                                </div>
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditorModal({ isNew: true, data: { day, startPeriod: tp.period, type: 'theory', periodSpan: 1 } })}
                                className="w-full min-h-[4.5rem] border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                              >
                                <Plus size={18} />
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editorModal && (
        <SlotEditorModal
          modal={editorModal}
          allMasterSlots={slots}
          allTeachers={teachers}
          onClose={() => setEditorModal(null)}
          onSave={handleSaveSlot}
          onDelete={handleDelete}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

// --- INTERNAL MODAL COMPONENT ---
function SlotEditorModal({ modal, allMasterSlots, allTeachers, onClose, onSave, onDelete, isSaving, isDeleting }: any) {
  const isNew = modal.isNew;
  const init = modal.data;

  const [form, setForm] = useState({
    courseCode: init.courseCode || '',
    courseName: init.courseName || '',
    type: init.type || 'theory',
    day: init.day,
    startPeriod: init.startPeriod,
    periodSpan: init.periodSpan || 1,
    room: init.room || '', 
    teachers: init.teachers || [],
    batchScope: init.batchScope || 'all',
    // --- NEW: Split Group State ---
    isSplit: init.isSplit || false,
    splitRooms: init.splitRooms || [],
    splitTeachers: init.splitTeachers || []
  });

  const isSplit = form.courseCode.includes('/');
  const splitCourses = isSplit ? form.courseCode.split('/').map((c: string) => c.trim()).filter(Boolean) : [];

  // Calculate Busy Status for Collision Detection
  const { busyRooms, busyTeachers } = useMemo(() => {
    const occupiedRooms = new Set<string>();
    const occupiedTeachers = new Set<string>();
    const requestedPeriods = Array.from({ length: Number(form.periodSpan) }, (_, i) => Number(form.startPeriod) + i);

    allMasterSlots.forEach((slot: any) => {
      if (!isNew && slot._id === init._id) return; // Don't collide with itself
      if (slot.day !== form.day) return;

      const slotSpan = slot.periodSpan || 1;
      const existingPeriods = Array.from({ length: slotSpan }, (_, i) => slot.startPeriod + i);
      const hasTimeOverlap = requestedPeriods.some(p => existingPeriods.includes(p));

      if (hasTimeOverlap) {
        if (slot.room && slot.room !== "N/A") {
          slot.room.split(/[,/]/).forEach((r: string) => occupiedRooms.add(r.trim()));
        }
        (slot.teachers || []).forEach((t: string) => {
          if (t !== "N/A") occupiedTeachers.add(t);
        });
      }
    });
    return { busyRooms: occupiedRooms, busyTeachers: occupiedTeachers };
  }, [form.day, form.startPeriod, form.periodSpan, allMasterSlots, init._id, isNew]);

  useEffect(() => {
    const newSpan = SPAN3_TYPES.includes(form.type) ? 3 : 1;
    setForm(prev => ({ ...prev, periodSpan: newSpan }));
  }, [form.type]);

  const isMultiRoom = form.courseCode.includes("XX") && !isSplit;

  // Generic Handlers
  const handleRoomToggle = (r: string) => {
    if (busyRooms.has(r)) return;
    if (isMultiRoom) {
      let currentRooms = form.room ? form.room.split(',').map((x: string) => x.trim()) : [];
      if (currentRooms.includes(r)) currentRooms = currentRooms.filter((x: string) => x !== r);
      else currentRooms.push(r);
      setForm({ ...form, room: currentRooms.join(', ') });
    } else {
      setForm({ ...form, room: r });
    }
  };

  const handleTeacherToggle = (t: string) => {
    if (busyTeachers.has(t)) return;
    let current = [...form.teachers];
    if (current.includes(t)) current = current.filter((x: string) => x !== t);
    else current.push(t);
    setForm({ ...form, teachers: current });
  };

  // --- NEW: Split Group Handlers ---
  const handleSplitRoomToggle = (index: number, r: string) => {
    if (busyRooms.has(r)) return;
    const newRooms = [...form.splitRooms];
    newRooms[index] = newRooms[index] === r ? "" : r;
    setForm({ ...form, splitRooms: newRooms });
  };

  const handleSplitTeacherToggle = (index: number, t: string) => {
    if (busyTeachers.has(t)) return;
    const newT = [...form.splitTeachers];
    if (!newT[index]) newT[index] = [];
    if (newT[index].includes(t)) newT[index] = newT[index].filter((x: string) => x !== t);
    else newT[index].push(t);
    setForm({ ...form, splitTeachers: newT });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalRoom = form.room;
    let finalTeachers = form.teachers;

    // Build the master strings so the PDF and global UI look perfect
    if (isSplit) {
      finalRoom = form.splitRooms.filter(Boolean).join(' / ');
      finalTeachers = form.splitTeachers.flat().filter(Boolean);
    }

    onSave({
      ...init,
      ...form,
      room: finalRoom,
      teachers: finalTeachers,
      startPeriod: Number(form.startPeriod),
      periodSpan: Number(form.periodSpan),
      isSplit
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm dark:bg-black/60 p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isNew ? "Add Class Slot" : "Edit Class Slot"}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Course Code</label>
              <input required value={form.courseCode} onChange={e => setForm({...form, courseCode: e.target.value.toUpperCase()})} placeholder="ETE 32XX or ETE 3212 / ETE 3214" className="w-full mt-1 rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
              <div className="mt-1">
                <DropdownFilter fullWidth value={form.type} onChange={(val) => setForm({ ...form, type: val })} options={TYPES.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Day</label>
              <div className="mt-1"><DropdownFilter fullWidth value={form.day} onChange={(val) => setForm({ ...form, day: val })} options={DAYS.map(d => ({ label: d.substring(0, 3), value: d }))} /></div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Start Period</label>
              <div className="mt-1"><DropdownFilter fullWidth value={String(form.startPeriod)} onChange={(val) => setForm({ ...form, startPeriod: Number(val) })} options={NUM_PERIODS.map(p => ({ label: `P${p}`, value: String(p) }))} /></div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Duration</label>
              <div className="mt-1"><DropdownFilter fullWidth value={String(form.periodSpan)} onChange={(val) => setForm({ ...form, periodSpan: Number(val) })} options={[1, 2, 3].map(p => ({ label: `${p} hr`, value: String(p) }))} /></div>
            </div>
          </div>

          {/* --- SMART RENDER: SPLIT VS GENERIC --- */}
          {isSplit ? (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 bg-ruet-blue/10 dark:bg-ruet-gold/10 p-3 rounded-xl border border-ruet-blue/20 dark:border-ruet-gold/20">
                <AlertCircle className="text-ruet-blue dark:text-ruet-gold shrink-0" size={18} />
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Divided course detected. Map specific rooms and teachers to each group.
                </p>
              </div>
              
              {splitCourses.map((sc: string, idx: number) => (
                <div key={idx} className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
                  <h4 className="font-black text-sm text-ruet-blue dark:text-ruet-gold tracking-tight">{sc}</h4>
                  
                  {/* Split Room */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Assigned Room</label>
                    <div className="flex flex-wrap gap-2">
                      {ROOMS.map(r => {
                        const isBusy = busyRooms.has(r);
                        const isSelectedElsewhere = form.splitRooms.some((sr: string, i: number) => i !== idx && sr === r);
                        const isSelected = form.splitRooms[idx] === r;
                        const disabled = isBusy || isSelectedElsewhere;
                        
                        return (
                          <button key={r} type="button" onClick={() => handleSplitRoomToggle(idx, r)} disabled={disabled}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                              disabled ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700"
                              : isSelected ? "bg-ruet-blue text-white border-ruet-blue dark:bg-ruet-gold dark:text-black dark:border-ruet-gold shadow-md"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-black/20 dark:border-white/10 dark:text-slate-300"
                            }`}
                          >
                            {r} {isBusy ? <span className="ml-1 text-[9px] opacity-70">(Busy)</span> : isSelectedElsewhere ? <span className="ml-1 text-[9px] opacity-70">(Used)</span> : ""}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Split Teacher */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Assigned Teachers</label>
                    <div className="flex flex-wrap gap-2">
                      {allTeachers.map((t: any) => {
                        const initInitials = t.initials;
                        if(!initInitials) return null;
                        const isBusy = busyTeachers.has(initInitials);
                        const isSelectedElsewhere = form.splitTeachers.some((st: string[], i: number) => i !== idx && st.includes(initInitials));
                        const isSelected = form.splitTeachers[idx]?.includes(initInitials);
                        const disabled = isBusy || isSelectedElsewhere;
                        
                        return (
                          <button key={initInitials} type="button" onClick={() => handleSplitTeacherToggle(idx, initInitials)} disabled={disabled}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                              disabled ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700"
                              : isSelected ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-500 dark:text-black dark:border-emerald-500 shadow-md"
                              : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-black/20 dark:border-white/10 dark:text-slate-300"
                            }`}
                          >
                            {initInitials} {isBusy ? <span className="ml-1 text-[9px] opacity-70">(Busy)</span> : isSelectedElsewhere ? <span className="ml-1 text-[9px] opacity-70">(Used)</span> : ""}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* GENERIC ROOM SELECTOR */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assign Room {isMultiRoom ? "(Multiple)" : ""}</label>
                  {isMultiRoom && <span className="text-[10px] bg-ruet-blue/10 text-ruet-blue px-2 py-0.5 rounded font-bold dark:bg-ruet-gold/10 dark:text-ruet-gold">"XX" Detected</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ROOMS.map(r => {
                    const isBusy = busyRooms.has(r);
                    const isSelected = isMultiRoom ? form.room?.includes(r) : form.room === r;
                    return (
                      <button key={r} type="button" onClick={() => handleRoomToggle(r)} disabled={isBusy}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                          isBusy ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed"
                          : isSelected ? "bg-ruet-blue text-white border-ruet-blue dark:bg-ruet-gold dark:text-black dark:border-ruet-gold shadow-md"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-black/20 dark:border-white/10 dark:text-slate-300"
                        }`}
                      >
                        {r} {isBusy && <span className="ml-1 text-[9px] opacity-70">(Busy)</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* GENERIC TEACHER SELECTOR */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assign Teachers</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {allTeachers.map((t: any) => {
                    const initInitials = t.initials;
                    if(!initInitials) return null;
                    const isBusy = busyTeachers.has(initInitials);
                    const isSelected = form.teachers.includes(initInitials);
                    return (
                      <button key={initInitials} type="button" onClick={() => handleTeacherToggle(initInitials)} disabled={isBusy}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all border ${
                          isBusy ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700 cursor-not-allowed"
                          : isSelected ? "bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-500 dark:text-black dark:border-emerald-500 shadow-md"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 dark:bg-black/20 dark:border-white/10 dark:text-slate-300"
                        }`}
                      >
                        {initInitials} {isBusy && <span className="ml-1 text-[9px] opacity-70">(Busy)</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            {!isNew && (
              <button type="button" onClick={() => onDelete(init._id)} disabled={isDeleting || isSaving} className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl border border-red-200 hover:bg-red-100 dark:bg-red-500/10 dark:border-red-500/20 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18}/>} {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
            <button type="submit" disabled={isSaving || isDeleting} className="flex-[2] bg-ruet-blue text-white font-bold py-3 rounded-xl hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18}/>} {isSaving ? "Saving..." : "Save Slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}