"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Plus, Calendar, Clock, MapPin, Users } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";

// Extracted from your constants.js
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

export default function RoutineBuilderPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [activeSeries, setActiveSeries] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const res = await fetch("/api/routine");
    if (res.ok) {
      const data = await res.json();
      setConfigs(data.seriesConfigs);
      setSlots(data.slots);
      if (data.seriesConfigs.length > 0 && !activeSeries) {
        setActiveSeries(Number(data.seriesConfigs[0].series));
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter slots for the currently selected series tab
  const activeSlots = slots.filter(s => s.series === activeSeries);
  const activeConfig = configs.find(c => Number(c.series) === activeSeries);

  // Your exact buildGrid logic[cite: 4]
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
    if (!confirm("Delete this routine slot?")) return;
    const res = await fetch(`/api/routine?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Slot deleted", "success");
      fetchData();
    }
  };

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-ruet-blue" size={32} /></div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Routine Builder</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Manage schedules for current active semesters.</p>
      </div>

      {/* Series Tabs */}
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

      {/* The Grid[cite: 4] */}
      {activeSeries && activeConfig && (
        <div className="glass-panel overflow-hidden rounded-3xl animate-in fade-in duration-300">
          <div className="overflow-x-auto custom-scrollbar p-1">
            <table className="w-full text-left text-sm min-w-[800px] table-fixed">
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
                              <div className="group relative w-full h-16 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg p-2 flex flex-col justify-center">
                                <span className="font-bold text-emerald-800 dark:text-emerald-400 text-xs truncate">{slot.courseCode}</span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 truncate">{slot.teachers?.join(', ')}</span>
                                <button onClick={() => handleDelete(slot._id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">×</button>
                              </div>
                            ) : (
                              <button className="w-full h-16 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                <Plus size={16} />
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
    </div>
  );
}