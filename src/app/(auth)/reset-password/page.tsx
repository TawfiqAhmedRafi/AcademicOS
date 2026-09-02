"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, EyeOff, Eye, KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only sending the new password. The identity is confirmed via the secure cookie.
        body: JSON.stringify({ newPassword }), 
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reset password");

      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 selection:bg-ruet-gold selection:text-black dark:bg-[#020617]">
      <div className="absolute top-1/4 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[120px] dark:bg-ruet-blue/30"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-ruet-gold/10 blur-[100px] dark:bg-ruet-gold/15"></div>

      <div className="w-full max-w-md px-4 sm:px-0">
        <div className="glass-panel overflow-hidden rounded-3xl p-8 transition-all duration-500">
          
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
              <KeyRound size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Password</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Your new password must be unique and securely stored.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-ruet-green/10 p-3 text-sm font-medium text-ruet-green dark:bg-ruet-green/20 dark:text-emerald-400">
              <CheckCircle2 size={16} className="flex-shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="newPassword" className="text-sm font-medium text-slate-700 dark:text-slate-300">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-white/50 py-3 pl-4 pr-12 text-sm focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold dark:focus:ring-ruet-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !newPassword}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}