import { AlertCircle } from "lucide-react";

export function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend?: string }) {
  return (
    <div className="glass-panel flex items-center justify-between rounded-3xl p-6">
      <div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
        <h3 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{value}</h3>
        {trend && <p className="mt-2 text-xs font-medium text-ruet-blue dark:text-ruet-gold">{trend}</p>}
      </div>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
        <Icon size={28} />
      </div>
    </div>
  );
}

export function AlertBanner({ title, message, type = "info" }: { title: string, message: string, type?: "info" | "warning" }) {
  const isWarning = type === "warning";
  return (
    <div className={`mb-8 flex items-start gap-4 rounded-2xl border p-5 ${
      isWarning 
        ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5" 
        : "border-ruet-blue/20 bg-ruet-blue/5 dark:border-ruet-gold/20 dark:bg-ruet-gold/5"
    }`}>
      <AlertCircle className={`mt-0.5 flex-shrink-0 ${isWarning ? "text-red-500 dark:text-red-400" : "text-ruet-blue dark:text-ruet-gold"}`} size={24} />
      <div>
        <h4 className={`text-lg font-bold ${isWarning ? "text-red-700 dark:text-red-300" : "text-slate-900 dark:text-white"}`}>{title}</h4>
        <p className={`mt-1 text-sm leading-relaxed ${isWarning ? "text-red-600 dark:text-red-200/70" : "text-slate-600 dark:text-slate-300"}`}>{message}</p>
      </div>
    </div>
  );
}