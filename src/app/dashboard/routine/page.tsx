"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, Clock, MapPin } from "lucide-react";

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

export default function StudentRoutinePage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoutine = async () => {
      const res = await fetch("/api/student/routine");
      if (res.ok) {
        setData(await res.json());
      }
      setIsLoading(false);
    };
    fetchRoutine();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
      </div>
    );
  }

  if (!data || !data.seriesConfig) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        Your class routine is currently unavailable. Please check back later.
      </div>
    );
  }

  const { seriesConfig, slots } = data;

  // Build the 2D grid logic mapped to days and periods
  const buildGrid = () => {
    const g: any = {};
    DAYS.forEach(d => { 
      g[d] = {}; 
      NUM_PERIODS.forEach(p => { g[d][p] = null; }); 
    });
    
    const consumed: any = {};
    
    slots.forEach((slot: any) => {
      const key = `${slot.day}-${slot.startPeriod}`;
      if (!consumed[key]) {
        const spanArr = Array.from({ length: slot.periodSpan || 1 }, (_, i) => slot.startPeriod + i);
        if (g[slot.day]) g[slot.day][slot.startPeriod] = { ...slot, periodSpanArr: spanArr };
        spanArr.slice(1).forEach(p => { 
          consumed[`${slot.day}-${p}`] = true; 
          if (g[slot.day]) g[slot.day][p] = 'CONSUMED'; 
        });
      }
    });
    return g;
  };

  const grid = buildGrid();

  // Dynamic color coding based on class type
  const getTypeStyles = (type: string) => {
    switch (type.toLowerCase()) {
      case 'theory': 
        return { card: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', text: 'text-blue-900 dark:text-blue-300', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' };
      case 'lab':
      case 'sessional': 
        return { card: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20', text: 'text-emerald-900 dark:text-emerald-300', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' };
      case 'project':
      case 'thesis': 
        return { card: 'bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20', text: 'text-purple-900 dark:text-purple-300', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' };
      default: 
        return { card: 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10', text: 'text-slate-900 dark:text-white', badge: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' };
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Class Routine</h1>
        <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
          <Calendar size={16} className="text-ruet-blue dark:text-ruet-gold" />
          Series {seriesConfig.series} <span className="opacity-50">|</span> Semester {seriesConfig.currentSemester}
        </p>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl shadow-xl">
        <div className="overflow-x-auto custom-scrollbar p-2">
          <table className="w-full text-left text-sm min-w-[900px] table-fixed">
            <thead>
              <tr>
                <th className="w-20 p-4 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 dark:border-white/10">Day</th>
                {TIME_PERIODS.map(tp => (
                  <th key={tp.period} className="p-3 text-center border-b border-l border-slate-200 dark:border-white/10">
                    {tp.isBreak ? (
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{tp.label}</span>
                    ) : (
                      <>
                        <div className="font-bold text-slate-700 dark:text-slate-300">P{tp.period}</div>
                        <div className="text-[9px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                          <Clock size={10} /> {tp.start}-{tp.end}
                        </div>
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
                    <td className="p-4 font-black text-slate-900 dark:text-white uppercase text-xs tracking-wider">{day.substring(0,3)}</td>
                    {TIME_PERIODS.map(tp => {
                      if (tp.isBreak) return <td key={tp.period} className="bg-amber-50/30 dark:bg-amber-500/5 border-l border-slate-200 dark:border-white/10" />;
                      
                      if (consumed[tp.period] || grid[day]?.[tp.period] === 'CONSUMED') return null;
                      
                      const slot = grid[day]?.[tp.period];
                      const colSpan = slot ? slot.periodSpanArr.length : 1;
                      if (slot) slot.periodSpanArr.slice(1).forEach((p: number) => consumed[p] = true);

                      const styles = slot ? getTypeStyles(slot.type) : null;

                      return (
                        <td key={tp.period} colSpan={colSpan} className="p-1.5 border-l border-slate-200 dark:border-white/10">
                          {slot ? (
                            <div className={`w-full h-full min-h-[5.5rem] border rounded-xl p-2.5 flex flex-col justify-between shadow-sm transition-transform hover:-translate-y-0.5 ${styles?.card}`}>
                              
                              <div className="flex justify-between items-start w-full mb-1">
                                <div className={`font-black text-xs sm:text-sm leading-tight ${styles?.text}`}>
                                  {slot.courseCode}
                                </div>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded leading-none ${styles?.badge}`}>
                                  {slot.type}
                                </span>
                              </div>
                              
                              <div className="flex flex-col gap-1 mt-auto">
                                <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 line-clamp-1" title={slot.teachers?.join(', ')}>
                                  {slot.teachers?.filter((t: string) => t !== "N/A").join(', ')}
                                </span>
                                {slot.room && slot.room !== "N/A" && (
                                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                    <MapPin size={10} /> {slot.room}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-full min-h-[5.5rem] rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-slate-300 dark:text-slate-700 font-medium uppercase tracking-widest">Free</span>
                            </div>
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
    </div>
  );
}