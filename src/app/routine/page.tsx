"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Loader2, Calendar, FileDown } from "lucide-react";

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"];
const TIME_PERIODS = [
  { period: 1, start: "8:00", end: "8:50" },
  { period: 2, start: "8:50", end: "9:40" },
  { period: 3, start: "9:40", end: "10:30" },
  { period: "BREAK", start: "10:30", end: "10:50", isBreak: true, label: "Break" },
  { period: 4, start: "10:50", end: "11:40" },
  { period: 5, start: "11:40", end: "12:30" },
  { period: 6, start: "12:30", end: "1:20" },
  { period: "PLB", start: "1:20", end: "2:30", isBreak: true, label: "P&LB" },
  { period: 7, start: "2:30", end: "3:20" },
  { period: 8, start: "3:20", end: "4:10" },
  { period: 9, start: "4:10", end: "5:00" },
];
const NUM_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function MasterRoutinePage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch the web view data
  useEffect(() => {
    const fetchRoutine = async () => {
      const res = await fetch("/api/routine");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.seriesConfigs.sort((a: any, b: any) => Number(b.series) - Number(a.series)));
        setSlots(data.slots);
      }
      setIsLoading(false);
    };
    fetchRoutine();
  }, []);

  // Hit the backend PDF generator route
  const handleDownloadPdf = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/routine/pdf");
      if (!res.ok) throw new Error("Failed to generate PDF");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ETE_Master_Routine_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Couldn't generate the PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const buildGrid = (seriesSlots: any[]) => {
    const g: any = {};
    DAYS.forEach(d => { g[d] = {}; NUM_PERIODS.forEach(p => { g[d][p] = null; }); });
    const consumed: any = {};
    seriesSlots.forEach(slot => {
      const key = `${slot.day}-${slot.startPeriod}`;
      if (!consumed[key]) {
        const spanArr = Array.from({ length: slot.periodSpan || 1 }, (_, i) => slot.startPeriod + i);
        if (g[slot.day]) g[slot.day][slot.startPeriod] = { ...slot, periodSpanArr: spanArr };
        spanArr.slice(1).forEach(p => { consumed[`${slot.day}-${p}`] = true; if (g[slot.day]) g[slot.day][p] = 'CONSUMED'; });
      }
    });
    return g;
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 dark:bg-[#020617] selection:bg-ruet-gold selection:text-black">
      <Navbar />
      <div className="fixed top-1/4 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[150px] dark:bg-ruet-blue/20"></div>
      
      <main className="flex-1 w-full pt-28 pb-16 px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="mx-auto max-w-[1400px]">
          
          <div className="mb-12 flex flex-col items-center text-center gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Master <span className="text-ruet-blue dark:text-ruet-gold">Routine</span>
              </h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Live schedules strictly synced with the active academic semesters.
              </p>
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting || isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-ruet-blue dark:bg-ruet-gold px-5 py-2.5 text-sm font-bold text-white dark:text-black shadow-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? <Loader2 className="animate-spin" size={16} /> : <FileDown size={16} />}
              {isExporting ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={40} /></div>
          ) : (
            <div className="space-y-12">
              {configs.map(cfg => {
                const seriesSlots = slots.filter(s => s.series === Number(cfg.series));
                const grid = buildGrid(seriesSlots);

                return (
                  <div key={cfg.series} className="glass-panel overflow-hidden rounded-3xl shadow-xl">
                    <div className="bg-ruet-blue/5 dark:bg-ruet-gold/5 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <h2 className="text-2xl font-black text-ruet-blue dark:text-ruet-gold">Series {cfg.series}</h2>
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Semester {cfg.currentSemester}</span>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar p-2">
                      <table className="w-full text-left text-sm min-w-[900px] table-fixed">
                        <thead>
                          <tr>
                            <th className="w-20 p-3 text-xs font-bold text-slate-500 uppercase">Day</th>
                            {TIME_PERIODS.map(tp => (
                              <th key={tp.period} className="p-3 text-center border-l border-slate-200 dark:border-white/10">
                                {tp.isBreak ? (
                                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{tp.label}</span>
                                ) : (
                                  <>
                                    <div className="font-bold text-slate-700 dark:text-slate-300">P{tp.period}</div>
                                    <div className="text-[9px] text-slate-400">{tp.start}-{tp.end}</div>
                                  </>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {DAYS.map(day => {
                            const consumed: any = {};
                            return (
                              <tr key={day}>
                                <td className="p-3 font-bold text-slate-900 dark:text-white text-xs">{day.substring(0,3)}</td>
                                {TIME_PERIODS.map(tp => {
                                  if (tp.isBreak) return <td key={tp.period} className="bg-amber-50/30 dark:bg-amber-500/5 border-l border-slate-200 dark:border-white/10" />;
                                  if (consumed[tp.period] || grid[day]?.[tp.period] === 'CONSUMED') return null;
                                  
                                  const slot = grid[day]?.[tp.period];
                                  const colSpan = slot ? slot.periodSpanArr.length : 1;
                                  if (slot) slot.periodSpanArr.slice(1).forEach((p: number) => consumed[p] = true);

                                  return (
                                    <td key={tp.period} colSpan={colSpan} className="p-1 border-l border-slate-200 dark:border-white/10">
                                      {slot ? (
                                        <div className="w-full h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 flex flex-col justify-center shadow-sm">
                                          <div className="flex justify-between items-start">
                                            <span className="font-black text-ruet-blue dark:text-ruet-gold text-xs truncate">{slot.courseCode}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-1 rounded">{slot.type}</span>
                                          </div>
                                          <div className="flex justify-between items-end mt-1">
                                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate">{slot.teachers?.join(', ')}</span>
                                            {slot.room !== "N/A" && <span className="text-[9px] text-slate-400">{slot.room}</span>}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="w-full h-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg" />
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
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}