"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { 
  LayoutDashboard, BookPlus, History, ClipboardEdit, CalendarDays, 
  GraduationCap, CalendarClock, Settings, Presentation, FileUp, Users, Calculator, ClipboardCheck, 
  CalendarPlus, DatabaseZap, Network, CalendarRange, FileCheck, 
  IdCard, BookType, LineChart, Activity, UserCog, ShieldCheck, 
  ScrollText, LogOut, Sun, Moon,
  Database
} from "lucide-react";
import { signOut } from "next-auth/react";

interface SidebarProps {
  user: any;
  onClose?: () => void;
}

export default function Sidebar({ user, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const currentTheme = theme === "system" ? systemTheme : theme;

const studentLinks = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Course Registration", href: "/dashboard/registration", icon: BookPlus },
    { name: "Backlog Registration", href: "/dashboard/backlog-registration", icon: History },
    { name: "Form Fill-up", href: "/dashboard/form-fillup", icon: ClipboardEdit },
    { name: "Academic Calendar", href: "/dashboard/calendar", icon: CalendarDays },
    { name: "Academic Results", href: "/dashboard/results", icon: GraduationCap },
    { name: "Class Routine", href: "/dashboard/routine", icon: CalendarClock },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const facultyBaseLinks = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Classes", href: "/dashboard/classes", icon: Presentation },
    { name: "Upload Marks", href: "/dashboard/marks", icon: FileUp },
    { name: "Projects & Thesis", href: "/dashboard/projects", icon: Database },
  ];

  const advisorLinks = [
    { name: "Series Roster", href: "/dashboard/roster", icon: Users },
    { name: "Result Engine", href: "/dashboard/tabulation", icon: Calculator },
    { name: "Pending Approvals", href: "/dashboard/approvals", icon: ClipboardCheck },
    { name: "Academic Calendar Builder", href: "/dashboard/calendar-builder", icon: CalendarPlus },
    { name: "Match Imports", href: "/dashboard/match-import", icon: DatabaseZap },
  ];

  const deptHeadLinks = [
    { name: "Series Manager", href: "/dashboard/series-manager", icon: Network },
    { name: "Routine Builder", href: "/dashboard/routine-builder", icon: CalendarRange },
    { name: "Result Approvals", href: "/dashboard/head-results", icon: FileCheck },
    { name: "Student Directory", href: "/dashboard/student-mgmt", icon: IdCard }
  ];

  const adminLinks = [
    { name: "System Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Match Vocabulary", href: "/dashboard/match-vocab", icon: BookType },
    { name: "Match Analysis", href: "/dashboard/match-analysis", icon: LineChart },
    { name: "Match Telemetry", href: "/dashboard/match-insights", icon: Activity },
    { name: "Faculty Management", href: "/dashboard/faculty-mgmt", icon: UserCog },
    { name: "User Management", href: "/dashboard/user-mgmt", icon: ShieldCheck },
    { name: "System Logs", href: "/dashboard/logs", icon: ScrollText },
  ];

  const displayAdminLinks = user.role === "admin" 
    ? adminLinks 
    : adminLinks.filter(link => link.href !== "/dashboard");

  const renderLinks = (links: any[], title?: string) => (
    <div className="mb-6">
      {title && <p className="mb-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>}
      <div className="space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link 
              key={link.name} 
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive 
                  ? "bg-ruet-blue text-white shadow-md dark:bg-ruet-gold dark:text-black" 
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
              }`}
            >
              <link.icon size={18} className={isActive ? "text-white dark:text-black" : "text-slate-400"} />
              {link.name}
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col justify-between border-r border-slate-200 bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f172a]/60">
      <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
        
        <div className="mb-10 px-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image src="/logo.png" alt="Logo" width={36} height={36} className="object-contain transition-transform group-hover:scale-105" />
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Academic <span className="text-ruet-gold">OS</span>
            </h2>
          </Link>
          {mounted ? (
            <button 
              onClick={() => setTheme(currentTheme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-ruet-gold dark:text-slate-400 dark:hover:bg-white/5"
            >
              {currentTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          ) : <div className="h-9 w-9" />}
        </div>

        {user.role === "student" && renderLinks(studentLinks)}
        
        {(user.role === "faculty" || user.role === "dept_head") && (
          <>
            {renderLinks(facultyBaseLinks, "Faculty Menu")}
            {user.advising_series && renderLinks(advisorLinks, `Advisor Tools (Series ${user.advising_series})`)}
          </>
        )}

        {user.role === "dept_head" && renderLinks(deptHeadLinks, "Head Tools")}
        
        {(user.role === "admin" || user.isAdmin) && renderLinks(displayAdminLinks, "Admin Panel")}

        {/* Global Settings link for Non-Students */}
        {user.role !== "student" && renderLinks([{ name: "Settings", href: "/dashboard/settings", icon: Settings }], "Account")}
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-white/10">
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/50 p-3 shadow-sm dark:bg-black/20">
          {user.image ? (
            <Image 
              src={user.image} 
              alt={user.name || "Profile"} 
              width={40} height={40} 
              className="h-10 w-10 flex-shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-[#0f172a]" 
            />
          ) : (
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {user.name?.charAt(0) || "U"}
            </div>
          )}
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{user.name}</span>
            <span className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">
              {user.role === 'dept_head' ? 'Dept Head' : user.role === 'student' ? 'Student' : 'Faculty'}
              {user.advising_series ? ` • Advisor` : ''}
            </span>
          </div>
        </div>
        <button 
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
}