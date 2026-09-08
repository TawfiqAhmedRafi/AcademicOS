"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarDays, Plus, Trash2, Save, Send, AlertCircle, Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import Swal from "sweetalert2";

type ScheduleEvent = { id: string; description: string; from: string; to: string; duration: string };
type CtSchedule = { courseCode: string; ct1: string; ct2: string; ct3: string; ct4: string };
type FinalSchedule = { exam: string; date: string };

const DEFAULT_EVENTS: ScheduleEvent[] = [
  { id: "def_1", description: "Class", from: "", to: "", duration: "" },
  { id: "def_2", description: "Course registration deadline", from: "", to: "", duration: "" },
  { id: "def_3", description: "Course Registration with late fee", from: "", to: "", duration: "" },
  { id: "def_4", description: "Mid semester", from: "", to: "", duration: "" },
  { id: "def_5", description: "Class", from: "", to: "", duration: "" },
  { id: "def_6", description: "Probable date for board viva", from: "", to: "", duration: "" },
  { id: "def_7", description: "Last class in this semester", from: "", to: "", duration: "" },
  { id: "def_8", description: "Semester final examination", from: "", to: "", duration: "" }
];

export default function CalendarBuilderPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // <-- NEW
  const { showToast } = useToast();

  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [ctSchedule, setCtSchedule] = useState<CtSchedule[]>([]);
  const [finalSchedule, setFinalSchedule] = useState<FinalSchedule[]>([
    { exam: "1st", date: "" }, { exam: "2nd", date: "" }, { exam: "3rd", date: "" }, { exam: "4th", date: "" }, { exam: "5th", date: "" }
  ]);

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/advisor/calendar");
    if (res.ok) {
      const json = await res.json();
      setData(json);
      
      if (json.calendar) {
        setEvents(json.calendar.scheduleEvents?.length > 0 ? json.calendar.scheduleEvents : [...DEFAULT_EVENTS]);
        setCtSchedule(json.calendar.ctSchedule || []);
        if (json.calendar.finalSchedule?.length) setFinalSchedule(json.calendar.finalSchedule);
      } else {
        setEvents([...DEFAULT_EVENTS]);
        setCtSchedule(json.defaultCtCourses.map((code: string) => ({
          courseCode: code, ct1: "", ct2: "", ct3: "", ct4: ""
        })));
      }
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const sortedEvents = [...events].sort((a, b) => {
    if (!a.from && !b.from) return 0;
    if (!a.from) return 1;
    if (!b.from) return -1;
    return new Date(a.from).getTime() - new Date(b.from).getTime();
  });

  const handleAddEvent = () => setEvents([...events, { id: Date.now().toString(), description: "", from: "", to: "", duration: "" }]);
  const handleUpdateEvent = (id: string, field: keyof ScheduleEvent, value: string) => setEvents(events.map(e => e.id === id ? { ...e, [field]: value } : e));
  const handleRemoveEvent = (id: string) => setEvents(events.filter(e => e.id !== id));
  const handleUpdateCt = (index: number, field: keyof CtSchedule, value: string) => { const updated = [...ctSchedule]; updated[index][field] = value; setCtSchedule(updated); };
  const handleUpdateFinal = (index: number, value: string) => { const updated = [...finalSchedule]; updated[index].date = value; setFinalSchedule(updated); };

  const handleSave = async (isPublish: boolean) => {
    if (isPublish) {
      const confirm = await Swal.fire({
        title: "Publish Calendar?",
        text: "This will immediately notify students and make the calendar available on their dashboards.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Publish",
        reverseButtons: true
      });
      if (!confirm.isConfirmed) return;
    }

    setIsSaving(true);
    const res = await fetch("/api/advisor/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        series: data.series,
        semester: data.semester,
        scheduleEvents: sortedEvents,
        ctSchedule,
        finalSchedule,
        isPublish
      })
    });

    if (res.ok) {
      showToast(isPublish ? "Calendar Published & Notice Sent" : "Draft Saved", "success");
      fetchData();
    } else {
      showToast("Failed to save calendar", "error");
    }
    setIsSaving(false);
  };

  // --- NEW: Download Handler ---
  const handleDownload = async () => {
    setIsDownloading(true);
    showToast("Generating PDF...", "info");
    try {
      const res = await fetch("/api/advisor/calendar/pdf");
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Academic_Calendar_Series_${data.series}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast("Download failed.", "error");
    }
    setIsDownloading(false);
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;

  const isPublished = data?.calendar?.status === "published";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <CalendarDays className="text-ruet-blue dark:text-ruet-gold" size={32} /> Academic Calendar Builder
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
            <span>Series {data.series} | Semester {data.semester}</span>
            {isPublished && (
              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 size={12}/> Live / Published
              </span>
            )}
          </div>
        </div>
        
        {/* --- NEW: Dynamic Workflow Buttons --- */}
        <div className="flex gap-3">
          <button onClick={() => handleSave(false)} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 transition-colors flex items-center gap-2 shadow-sm">
            <Save size={16} /> {isPublished ? "Revert to Draft" : "Save Draft"}
          </button>
          
          {isPublished ? (
            <button onClick={handleDownload} disabled={isDownloading} className="px-6 py-2.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200 shadow-lg transition-colors flex items-center gap-2">
              {isDownloading ? <Loader2 className="animate-spin" size={16}/> : <Download size={16} />} Download PDF
            </button>
          ) : (
            <button onClick={() => handleSave(true)} disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold bg-ruet-blue text-white hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 shadow-lg transition-colors flex items-center gap-2">
              {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />} Publish
            </button>
          )}
        </div>
      </div>

      <div className={`space-y-8 transition-opacity ${isPublished ? 'opacity-80' : ''}`}>
        
        {/* SECTION 1: DYNAMIC EVENTS */}
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">1. Class and Examination Schedule</h3>
            <button onClick={handleAddEvent} className="flex items-center gap-1 text-sm font-bold text-ruet-blue dark:text-ruet-gold hover:underline">
              <Plus size={16} /> Add Event Row
            </button>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-xl mb-4 flex items-start gap-2 border border-amber-200 dark:border-amber-500/20">
            <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />
            <p className="text-xs text-amber-800 dark:text-amber-200">Standard events are pre-filled. Add vacation rows and input dates; the table will automatically sort chronologically before saving.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold w-1/3 text-slate-600 dark:text-slate-300">Description</th>
                  <th className="px-4 py-3 font-semibold w-1/5 text-slate-600 dark:text-slate-300">From</th>
                  <th className="px-4 py-3 font-semibold w-1/5 text-slate-600 dark:text-slate-300">To (Optional)</th>
                  <th className="px-4 py-3 font-semibold w-1/6 text-slate-600 dark:text-slate-300">Duration</th>
                  <th className="px-4 py-3 font-semibold w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {sortedEvents.map(event => (
                  <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-2">
                      <input type="text" value={event.description} onChange={(e) => handleUpdateEvent(event.id, "description", e.target.value)} placeholder="e.g. Durga Puja Vacation" className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-3 py-1.5 focus:border-ruet-blue dark:focus:border-ruet-gold outline-none font-medium text-slate-900 dark:text-white" />
                    </td>
                    <td className="p-2">
                      <input type="date" value={event.from} onChange={(e) => handleUpdateEvent(event.id, "from", e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-3 py-1.5 focus:border-ruet-blue dark:focus:border-ruet-gold outline-none text-slate-700 dark:text-slate-300" />
                    </td>
                    <td className="p-2">
                      <input type="date" value={event.to} onChange={(e) => handleUpdateEvent(event.id, "to", e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-3 py-1.5 focus:border-ruet-blue dark:focus:border-ruet-gold outline-none text-slate-700 dark:text-slate-300" />
                    </td>
                    <td className="p-2">
                      <input type="text" value={event.duration} onChange={(e) => handleUpdateEvent(event.id, "duration", e.target.value)} placeholder="e.g. 1 Week" className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-3 py-1.5 focus:border-ruet-blue dark:focus:border-ruet-gold outline-none text-slate-700 dark:text-slate-300" />
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => handleRemoveEvent(event.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SECTION 2: CT SCHEDULE */}
          <div className="glass-panel rounded-3xl p-6 lg:col-span-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">2. Class Test (CT) Schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
                <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Course No.</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 01</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 02</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 03</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 04</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {ctSchedule.map((ct, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                      <td className="p-3 font-bold text-slate-900 dark:text-white max-w-[120px] truncate" title={ct.courseCode}>
                        <input type="text" value={ct.courseCode} onChange={(e) => handleUpdateCt(idx, "courseCode", e.target.value)} className="w-full bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-ruet-blue outline-none py-1" />
                      </td>
                      <td className="p-2"><input type="date" value={ct.ct1} onChange={(e) => handleUpdateCt(idx, "ct1", e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-2 py-1 focus:border-ruet-blue outline-none text-xs text-slate-700 dark:text-slate-300" /></td>
                      <td className="p-2"><input type="date" value={ct.ct2} onChange={(e) => handleUpdateCt(idx, "ct2", e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-2 py-1 focus:border-ruet-blue outline-none text-xs text-slate-700 dark:text-slate-300" /></td>
                      <td className="p-2"><input type="date" value={ct.ct3} onChange={(e) => handleUpdateCt(idx, "ct3", e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-2 py-1 focus:border-ruet-blue outline-none text-xs text-slate-700 dark:text-slate-300" /></td>
                      <td className="p-2"><input type="date" value={ct.ct4} onChange={(e) => handleUpdateCt(idx, "ct4", e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-2 py-1 focus:border-ruet-blue outline-none text-xs text-slate-700 dark:text-slate-300" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: TENTATIVE EXAM SCHEDULE */}
          <div className="glass-panel rounded-3xl p-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">3. Final Exams</h3>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Exam</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {finalSchedule.map((fs, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="p-3 font-bold text-slate-900 dark:text-white text-center">{fs.exam}</td>
                    <td className="p-2">
                      <input type="date" value={fs.date} onChange={(e) => handleUpdateFinal(idx, e.target.value)} className="w-full bg-transparent border border-slate-300 dark:border-white/20 rounded-lg px-3 py-1.5 focus:border-ruet-blue dark:focus:border-ruet-gold outline-none text-slate-700 dark:text-slate-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}