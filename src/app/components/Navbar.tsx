"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, Bell, Moon, Sun, Loader2 } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Real authentication state
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Theme logic
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
            <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Academic <span className="text-ruet-gold">OS</span>
            </Link>
          </div>

          {/* MIDDLE: Clean, Dedicated Navigation Tabs */}
          <div className="hidden lg:block">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">Home</Link>
              <Link href="/courses" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">All courses</Link>
              <Link href="/match" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">Match Project</Link>
              <Link href="/notice" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">All Notices</Link>
              <Link href="/routine" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">Routine</Link>
              {isAuthenticated && (
                <Link href="/dashboard" className="text-sm font-medium text-slate-900 transition-colors hover:text-ruet-blue dark:text-slate-300 dark:hover:text-ruet-gold">
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT: Utilities & Auth */}
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <button className="rounded-full p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5">
                <Bell size={20} />
              </button>
              {mounted ? (
                <button
                  onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
                  className="rounded-full p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5"
                  aria-label="Toggle Dark Mode"
                >
                  {currentTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              ) : (
                <div className="h-9 w-9" />
              )}
            </div>

            <div className="hidden h-6 w-px bg-slate-300 dark:bg-slate-700 lg:block"></div>

            {/* Desktop Auth State */}
            {status === "loading" ? (
              <div className="hidden items-center justify-center w-32 lg:flex">
                <Loader2 className="animate-spin text-slate-400" size={20} />
              </div>
            ) : isAuthenticated && session?.user ? (
              <div className="hidden items-center gap-5 lg:flex">
                {/* 2nd Format: Avatar Left, Name & Email Stacked Right */}
                <div className="flex items-center gap-3">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "Profile"}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-[#020617]"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {session.user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-bold leading-tight text-slate-900 dark:text-white">
                      {session.user.name}
                    </span>
                    <span className="text-xs font-medium leading-tight text-slate-500 dark:text-slate-400">
                      {session.user.email}
                    </span>
                  </div>
                </div>
                
                {/* Logout Button */}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-red-500/30 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-4 lg:flex">
                <Link href="/login" className="text-sm font-semibold text-slate-900 transition-colors hover:text-ruet-gold dark:text-white">
                  Sign In
                </Link>
                <Link href="/login" className="rounded-xl bg-ruet-blue px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
                  Portal Access
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
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
            <Link href="/" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white">Home</Link>
            <Link href="/courses" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white">All courses</Link>
            <Link href="/match" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white">Match Project</Link>
            <Link href="/notice" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white">All Notices</Link>
            <Link href="/routine" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white">Routine</Link>
            {isAuthenticated && (
              <Link href="/dashboard" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white">
                Dashboard
              </Link>
            )}
            
            <div className="my-2 h-px w-full bg-slate-200 dark:bg-slate-700"></div>

            {/* Mobile Auth State */}
            {status === "loading" ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-slate-400" size={24} />
              </div>
            ) : isAuthenticated && session?.user ? (
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-500 dark:bg-slate-700">
                      {session.user.name?.charAt(0) || "U"}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{session.user.name}</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{session.user.email}</span>
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="block w-full rounded-xl bg-red-50 px-4 py-3 text-center text-base font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="block rounded-lg px-4 py-3 text-base font-medium text-slate-900 hover:bg-white/5 dark:text-white">
                  Sign In
                </Link>
                <Link href="/login" className="mt-2 block w-full rounded-xl bg-ruet-gold px-4 py-3 text-center text-base font-bold text-black hover:bg-amber-400">
                  Portal Access
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}