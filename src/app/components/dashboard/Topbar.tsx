"use client";

import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import Sidebar from "./Sidebar";

export default function Topbar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Theme state
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);
  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0f172a]/80">
        <div className="font-bold text-slate-900 dark:text-white">Academic <span className="text-ruet-gold">OS</span></div>
        
        {/* Actions Container */}
        <div className="flex items-center gap-2">
          {/* Theme Toggler */}
          {mounted ? (
            <button 
              onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5"
              aria-label="Toggle Dark Mode"
            >
              {currentTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          ) : (
            <div className="h-9 w-9" />
          )}

          {/* Hamburger Menu */}
          <button 
            onClick={() => setIsOpen(true)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm dark:bg-black/60 lg:hidden">
          {/* Drawer Menu */}
          <div className="absolute right-0 top-0 h-full w-4/5 max-w-sm bg-white shadow-2xl dark:bg-[#0f172a]">
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 z-50 rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-white/10 dark:text-white"
            >
              <X size={20} />
            </button>
            <Sidebar user={user} onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}