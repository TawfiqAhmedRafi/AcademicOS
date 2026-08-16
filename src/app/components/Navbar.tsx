"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const isAuthenticated = false; // Mock state for now

  // Theme logic
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering the toggle after mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine current theme, falling back to system preference
  const currentTheme = theme === "system" ? systemTheme : theme;

  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300">
      <div className="w-full px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="flex h-20 items-center justify-between">
          {/* LEFT: Logo & Brand */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <Image
              src="/logo.png"
              alt="Academic OS Logo"
              width={48}
              height={48}
              className="h-10 w-10 sm:h-11 sm:w-11 lg:h-14 lg:w-14 2xl:h-16 2xl:w-16 object-contain"
            />

            <Link
              href="/"
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
            >
              Academic <span className="text-ruet-gold">OS</span>
            </Link>
          </div>

          {/* MIDDLE: Clean, Dedicated Navigation Tabs */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-8">
              <Link
                href="/"
                className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold"
              >
                Home
              </Link>
              <Link
                href="/modules"
                className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold"
              >
                All Modules
              </Link>
              <Link
                href="/match"
                className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold"
              >
                Match Project
              </Link>
              <Link
                href="/notice"
                className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold"
              >
               All Notices
              </Link>
              <Link
                href="/routine"
                className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold"
              >
               Routine
              </Link>
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold"
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT: Utilities & Auth */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Always visible utilities (Bell + Theme Toggle) */}
            <div className="flex items-center gap-3 sm:gap-4">
              <button className="rounded-full p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5">
                <Bell size={20} />
              </button>

              {/* Hydration-safe Theme Toggle */}
              {mounted ? (
                <button
                  onClick={() =>
                    setTheme(currentTheme === "dark" ? "light" : "dark")
                  }
                  className="rounded-full p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5"
                  aria-label="Toggle Dark Mode"
                >
                  {currentTheme === "dark" ? (
                    <Sun size={20} />
                  ) : (
                    <Moon size={20} />
                  )}
                </button>
              ) : (
                // Placeholder of the exact same size to prevent layout shift before mount
                <div className="h-9 w-9" />
              )}
            </div>

            <div className="hidden h-6 w-px bg-slate-300 dark:bg-slate-700 lg:block"></div>

            {/* Auth Buttons (Desktop only) */}
            <div className="hidden items-center gap-4 lg:flex">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-900 transition-colors hover:text-ruet-gold dark:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="rounded-xl bg-ruet-blue px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
              >
                Portal Access
              </Link>
            </div>

            {/* Mobile Menu Toggle (Mobile only) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800 lg:hidden"
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
            <Link
              href="/"
              className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white"
            >
              Home
            </Link>
            <Link
              href="/modules"
              className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white"
            >
              All Modules
            </Link>
            <Link
              href="/match"
              className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white"
            >
              Match Project
            </Link>
            <Link
              href="/notice"
              className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white"
            >
              All Notices
            </Link>
            <Link
              href="/routine"
              className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white"
            >
               Routine
            </Link>
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white"
              >
                Dashboard
              </Link>
            )}

            <div className="my-2 h-px w-full bg-slate-200 dark:bg-slate-700"></div>

            <Link
              href="/login"
              className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="mt-2 block w-full rounded-xl bg-ruet-gold px-4 py-3 text-center text-base font-bold text-black hover:bg-amber-400"
            >
              Portal Access
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
