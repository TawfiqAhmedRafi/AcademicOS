"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarDays, Download, Clock } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";

export default function StudentCalendarPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchCalendar = async () => {
      const res = await fetch("/api/student/calendar");
      if (res.ok) setData(await res.json());
      setIsLoading(false);
    };
    fetchCalendar();
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    showToast("Generating PDF...", "info");
    try {
      const res = await fetch("/api/student/calendar/pdf");
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Academic_Calendar_Series_${data.seriesConfig.series}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast("Download failed.", "error");
    }
    setIsDownloading(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  if (isLoading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>;
  if (!data?.calendar) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <CalendarDays className="h-16 w-16 text-slate-300 dark:text-slate-700 mb-4" />
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Not Published Yet</h2>
      <p className="text-sm text-slate-500 mt-2">The academic calendar for your current semester has not been published by your advisor.</p>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <CalendarDays className="text-ruet-blue dark:text-ruet-gold" size={32} /> Academic Calendar
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Series {data.seriesConfig.series} | Semester {data.seriesConfig.currentSemester}
          </p>
        </div>
        <button onClick={handleDownload} disabled={isDownloading} className="flex items-center justify-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-black px-6 py-3 rounded-xl font-bold transition-all shadow-xl hover:scale-105 disabled:opacity-70 disabled:hover:scale-100">
          {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Download PDF
        </button>
      </div>

      <div className="space-y-8">
        {/* Table 1: Events */}
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Class & Examination Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Description</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">From</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">To</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.calendar.scheduleEvents.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{ev.description}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(ev.from)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(ev.to)}</td>
                    <td className="px-4 py-3 font-semibold text-ruet-blue dark:text-ruet-gold text-right">{ev.duration || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: CTs */}
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Class Test Schedule</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm whitespace-nowrap">
              <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 text-left">Course No.</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 01</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 02</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 03</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">CT 04</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.calendar.ctSchedule.map((ct: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white text-left">{ct.courseCode}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(ct.ct1)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(ct.ct2)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(ct.ct3)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatDate(ct.ct4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 3: Finals */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-xl">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Tentative Final Examination</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center text-sm whitespace-nowrap">
              <thead className="bg-slate-100/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Examination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {data.calendar.finalSchedule.map((fs: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{formatDate(fs.date)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{fs.exam}</td>
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