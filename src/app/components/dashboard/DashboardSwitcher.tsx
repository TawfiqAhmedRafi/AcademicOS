"use client";

import { useState } from "react";
import { LayoutDashboard, BookOpen, ShieldAlert, GraduationCap } from "lucide-react";
import StudentView from "./views/StudentView";
import FacultyView from "./views/FacultyView";
import DeptHeadView from "./views/DeptHeadView";
import AdminView from "./views/AdminView";

export default function DashboardSwitcher({ user }: { user: any }) {
  // 1. Dynamically build the available tabs based on the user's permissions
  const availableTabs = [];

  if (user.role === "dept_head") {
    availableTabs.push({ id: "head", label: "Head Overview", icon: LayoutDashboard });
    availableTabs.push({ id: "faculty", label: "My Faculty Dashboard", icon: BookOpen });
  } else if (user.role === "faculty") {
    availableTabs.push({ id: "faculty", label: "Faculty Dashboard", icon: BookOpen });
  } else if (user.role === "student") {
    availableTabs.push({ id: "student", label: "Student Dashboard", icon: GraduationCap });
  }

  // If they are explicitly the 'admin' role OR if they have the 'isAdmin' flag 
  if (user.role === "admin" || user.isAdmin) {
    availableTabs.push({ id: "admin", label: "System Admin Console", icon: ShieldAlert });
  }

  // 2. Set default active tab
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id || "faculty");

  return (
    <div className="w-full">
      {/* 3. Render the Tab Switcher ONLY if they have multiple roles */}
      {availableTabs.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-white/10 pb-4 custom-scrollbar">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 whitespace-nowrap flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
                activeTab === tab.id
                  ? "bg-ruet-blue text-white dark:bg-ruet-gold dark:text-black"
                  : "bg-white/50 text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              <tab.icon size={16} className="shrink-0" /> {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* 4. Render the active view cleanly */}
      <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "head" && <DeptHeadView user={user} />}
        {activeTab === "faculty" && <FacultyView user={user} />}
        {activeTab === "student" && <StudentView user={user} />}
        {activeTab === "admin" && <AdminView user={user} />}
      </div>
    </div>
  );
}