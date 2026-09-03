"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, Activity, KeyRound, Server, Loader2, Database } from "lucide-react";

type Log = {
  _id: string;
  action: string;
  type: "Security" | "System" | "Audit" | "Service";
  details: string;
  timestamp: string;
};

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
      setIsLoading(false);
    };
    fetchLogs();
  }, []);

  const getLogIcon = (type: string) => {
    switch (type) {
      case "Security": return { icon: KeyRound, color: "text-red-500 bg-red-100 dark:bg-red-500/20" };
      case "System": return { icon: Server, color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20" };
      case "Audit": return { icon: ShieldCheck, color: "text-ruet-blue bg-ruet-blue/10 dark:text-ruet-gold dark:bg-ruet-gold/10" };
      case "Service": return { icon: Activity, color: "text-purple-500 bg-purple-100 dark:bg-purple-500/20" };
      default: return { icon: Database, color: "text-slate-500 bg-slate-100 dark:bg-slate-800" };
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">System Activity Logs</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Real-time audit trail of database transactions and security events.</p>
      </div>
      
      <div className="glass-panel overflow-hidden rounded-3xl p-6">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">No logs generated yet.</div>
        ) : (
          <div className="space-y-6">
            {logs.map(log => {
              const { icon: Icon, color } = getLogIcon(log.type);
              return (
                <div key={log._id} className="flex items-start gap-4 border-b border-slate-100 pb-6 last:border-0 last:pb-0 dark:border-white/5">
                  <div className={`mt-1 flex-shrink-0 rounded-full p-2 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{log.action}</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{log.details}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-500">
                      <span className="uppercase tracking-wider">{log.type}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}