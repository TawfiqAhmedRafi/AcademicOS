"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToast({ message, type, id });
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-slate-800 animate-in slide-in-from-bottom-5 fade-in duration-300">
          {toast.type === "success" && <CheckCircle className="text-emerald-500" size={24} />}
          {toast.type === "error" && <AlertCircle className="text-red-500" size={24} />}
          {toast.type === "info" && <Info className="text-ruet-blue dark:text-ruet-gold" size={24} />}
          
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{toast.message}</p>
          
          <button 
            onClick={() => setToast(null)} 
            className="ml-4 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}