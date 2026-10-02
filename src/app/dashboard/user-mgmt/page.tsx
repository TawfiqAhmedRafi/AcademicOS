"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Unlock,
  Search,
  Loader2,
  Mail,
  Lock,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useToast } from "../../components/ToastProvider";
import Pagination from "../../components/Pagination";
import Swal from "sweetalert2";

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  series?: string;
  lockoutUntil?: string;
  isAdmin?: boolean;
};

export default function UserManagement() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 60;

  const { showToast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      setUsers(await res.json());
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (userId: string, action: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    if (res.ok) {
      showToast("User updated successfully", "success");
      fetchUsers();
    } else {
      showToast("Action failed", "error");
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    const result = await Swal.fire({
      title: "Permanently Delete?",
      text: `Are you absolutely sure you want to PERMANENTLY delete ${name}? This action cannot be undone.`,
      icon: "error",
      showCancelButton: true,
      confirmButtonText: "Yes, permanently delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    const res = await fetch(`/api/admin/users?id=${userId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast(`${name} deleted permanently`, "success");
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to delete user", "error");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">
          Master User Directory
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Monitor accounts, manage admin privileges, and remove users.
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
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
            <Loader2
              className="animate-spin text-ruet-blue dark:text-ruet-gold"
              size={32}
            />
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/50 dark:border-white/10 dark:bg-white/5">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Name & Role
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Email
                  </th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">
                    Security Status
                  </th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {currentUsers.map((user) => {
                  const isLocked =
                    user.lockoutUntil &&
                    new Date(user.lockoutUntil) > new Date();
                  const isMe = user._id === currentUserId;
                  const isSuperAdmin = user.role === "admin" || user.isAdmin;

                  return (
                    <tr
                      key={user._id}
                      className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {user.name}
                          {isMe && (
                            <span className="text-[10px] bg-ruet-blue text-white px-2 py-0.5 rounded-full">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-500 capitalize mt-1">
                          {user.role.replace("_", " ")}{" "}
                          {user.series ? `(Series ${user.series})` : ""}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Mail size={14} className="text-slate-400" />{" "}
                          {user.email}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isLocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
                              <Lock size={12} /> Locked Out
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                              Secure
                            </span>
                          )}
                          {isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                              <ShieldCheck size={12} /> Admin Access
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {isLocked && !isMe && (
                            <button
                              onClick={() => handleAction(user._id, "unlock")}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ruet-blue hover:bg-slate-100 dark:text-ruet-gold dark:hover:bg-white/5 transition-colors"
                            >
                              <Unlock size={14} /> Unlock
                            </button>
                          )}

                          {!isMe && (
                            <>
                              <button
                                onClick={() =>
                                  handleAction(user._id, "toggle_admin")
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 transition-colors"
                              >
                                {user.isAdmin ? (
                                  <>
                                    <ShieldOff size={14} /> Revoke Admin
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck size={14} /> Make Admin
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() =>
                                  handleDelete(user._id, user.name)
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </>
                          )}
                          {isMe && (
                            <span className="text-xs text-slate-400 italic">
                              Self-actions disabled
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {!isLoading && filteredUsers.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 mt-auto">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
