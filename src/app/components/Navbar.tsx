"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Bell, Moon, Sun } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const isAuthenticated = false;

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="flex h-20 items-center justify-between">
          
          {/* LEFT: Logo & Brand */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-lg ring-1 ring-white/20">
              <Image src="/logo.jpg" alt="AOS Logo" fill className="object-cover" />
            </div>
            <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Academic <span className="text-ruet-gold">OS</span>
            </Link>
          </div>

          {/* MIDDLE: Navigation Tabs (Hidden on Mobile) */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">Platform</Link>
              <Link href="#features" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">Features</Link>
              <Link href="#workflow" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">How it Works</Link>
              <Link href="/match" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">Match Project/Thesis</Link>
              {isAuthenticated && (
                <Link href="/dashboard" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">Dashboard</Link>
              )}
            </div>
          </div>

          {/* RIGHT: Utilities & Auth */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Always visible utilities */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5 transition-all">
                <Bell size={20} />
              </button>
              <button 
                onClick={() => setIsDark(!isDark)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5 transition-all"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            <div className="hidden lg:block h-6 w-px bg-slate-300 dark:bg-slate-700"></div>

            {/* Auth Buttons (Hidden on Mobile) */}
            <div className="hidden lg:flex items-center gap-4">
              <Link href="/login" className="text-sm font-semibold text-slate-900 dark:text-white hover:text-ruet-gold transition-colors">
                Sign In
              </Link>
              <Link href="/login" className="rounded-xl bg-ruet-blue px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
                Portal Access
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <div className="glass-panel border-t border-white/10 lg:hidden">
          <div className="flex flex-col space-y-2 px-4 pb-6 pt-4">
            <Link href="/" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 dark:text-white hover:bg-white/5">Platform</Link>
            <Link href="#features" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 dark:text-white hover:bg-white/5">Features</Link>
            <Link href="#workflow" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 dark:text-white hover:bg-white/5">How it Works</Link>
            <Link href="/match" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 dark:text-white hover:bg-white/5">Match Project/Thesis</Link>
            
            <div className="my-2 h-px w-full bg-slate-200 dark:bg-slate-700"></div>
            
            <Link href="/login" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 dark:text-white hover:bg-white/5">Sign In</Link>
            <Link href="/login" className="mt-2 block w-full rounded-xl bg-ruet-gold px-4 py-3 text-center text-base font-bold text-black hover:bg-amber-400">
              Portal Access
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}