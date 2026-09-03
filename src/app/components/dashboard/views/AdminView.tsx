"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Database, Users, ShieldAlert, UserCog, Activity, GraduationCap, Clock, AlertTriangle } from "lucide-react";
import { StatCard, AlertBanner } from "../Widgets";

export default function AdminView({ user }: { user: any }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalFaculty: 0,
    lockedAccounts: 0,
    pendingSetups: 0,
    status: "Loading..."
  });

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch("/api/admin/overview");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats(prev => ({ ...prev, status: "Degraded" }));
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h1 className="mb-8 text-3xl font-extrabold text-slate-900 dark:text-white">
        System Overview
      </h1>

      {stats.lockedAccounts > 0 ? (
        <AlertBanner 
          title="Security Alert: Locked Accounts" 
          message={`There are currently ${stats.lockedAccounts} user accounts locked due to excessive failed login attempts.`} 
          type="warning"
        />
      ) : (
        <AlertBanner 
          title="System Secure" 
          message="All backend services are responding normally. No security flags detected." 
        />
      )}

      {/* LIVE DATABASE STATS */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="System Status" 
          value={stats.status} 
          icon={Activity} 
          trend={stats.status === "Online" ? "MongoDB Connected" : "Connection Issue"} 
        />
        <StatCard 
          title="Total Users" 
          value={stats.totalUsers.toString()} 
          icon={Users} 
          trend={`${stats.pendingSetups} pending setup`}
        />
        <StatCard 
          title="Faculty & Staff" 
          value={stats.totalFaculty.toString()} 
          icon={UserCog} 
        />
        <StatCard 
          title="Enrolled Students" 
          value={stats.totalStudents.toString()} 
          icon={GraduationCap} 
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-panel rounded-3xl p-6">
          <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Security & Provisioning</h3>
          <div className="space-y-3">
            <Link href="/dashboard/faculty-mgmt" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">Manage Faculty Members</span>
              <UserCog size={18} className="text-slate-400" />
            </Link>
            
            {/* New link for managing all users (unlocking accounts) */}
            <Link href="/dashboard/user-mgmt" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Master User Directory</span>
                {stats.lockedAccounts > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600 dark:bg-red-500/20 dark:text-red-400">
                    {stats.lockedAccounts}
                  </span>
                )}
              </div>
              <ShieldAlert size={18} className="text-slate-400" />
            </Link>

            <Link href="/dashboard/logs" className="flex w-full items-center justify-between rounded-xl bg-white/50 p-4 transition-colors hover:bg-white/80 dark:bg-white/5 dark:hover:bg-white/10">
              <span className="font-semibold text-slate-700 dark:text-slate-200">View System Logs</span>
              <Database size={18} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}