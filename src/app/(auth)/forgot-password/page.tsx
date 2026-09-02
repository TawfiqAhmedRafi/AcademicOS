"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, AlertCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to send OTP");
      }

      // Redirect to the verify page and pass the email in the URL
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 selection:bg-ruet-gold selection:text-black dark:bg-[#020617]">
      {/* Cinematic Ambient Lighting */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[120px] dark:bg-ruet-blue/30"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-ruet-gold/10 blur-[100px] dark:bg-ruet-gold/15"></div>

      <div className="w-full max-w-md px-4 sm:px-0">
        <div className="glass-panel overflow-hidden rounded-3xl p-8 transition-all duration-500">
          
          <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft size={16} />
            Back to login
          </Link>

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
              <Mail size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forgot Password</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Enter your registered email and we will send you an OTP to reset your password.
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your institutional email"
                className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-sm focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold dark:focus:ring-ruet-gold"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !email}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Send OTP"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}