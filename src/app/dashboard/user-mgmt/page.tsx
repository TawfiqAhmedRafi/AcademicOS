"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Unlock, Search, Loader2, Mail, Lock } from "lucide-react";

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  series?: string;
  lockoutUntil?: string;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchUsers = async () => {
    setIsLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUnlock = async (userId: string, name: string) => {
    if (!confirm(`Unlock account for ${name}?`)) return;
    
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unlock", userId }),
    });

    if (res.ok) fetchUsers();
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Master User Directory</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Monitor all accounts and unlock users who trigger the brute-force protection.</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white/50 py-2.5 pl-10 pr-4 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold"
        />
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl pb-24">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Name & Role</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Email</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Security Status</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredUsers.map((user) => {
                  const isLocked = user.lockoutUntil && new Date(user.lockoutUntil) > new Date();
                  
                  return (
                    <tr key={user._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-xs font-semibold text-slate-500 capitalize mt-1">
                          {user.role.replace('_', ' ')} {user.series ? `(Series ${user.series})` : ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Mail size={14} className="text-slate-400" /> {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
                            <Lock size={12} /> Locked Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                            Secure
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isLocked ? (
                          <button 
                            onClick={() => handleUnlock(user._id, user.name)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-ruet-blue hover:underline dark:text-ruet-gold"
                          >
                            <Unlock size={14} /> Unlock Account
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No Action Required</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}