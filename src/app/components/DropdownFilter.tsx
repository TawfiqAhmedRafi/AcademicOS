"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownFilterProps {
  options: DropdownOption[];
  value: string;
  onChange: (val: string) => void;
  icon?: ReactNode;
}

export default function DropdownFilter({ options, value, onChange, icon }: DropdownFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full min-w-[180px] items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white/80 focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-slate-200 dark:hover:bg-white/5 dark:focus:border-ruet-gold dark:focus:ring-ruet-gold sm:py-2.5"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-slate-400">{icon}</span>}
          <span>{selectedOption.label}</span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[180px] animate-in fade-in slide-in-from-top-2 overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/95">
          <ul className="max-h-60 overflow-y-auto py-1">
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-white/10 ${
                    value === option.value 
                      ? "bg-ruet-blue/5 font-bold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold" 
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}