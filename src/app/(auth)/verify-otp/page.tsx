"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft, AlertCircle, ShieldCheck, CheckCircle2 } from "lucide-react";

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");

      setSuccess("OTP verified! Redirecting...");
      
      // Redirect to reset page, passing both email and the verified OTP
      setTimeout(() => {
        router.push(`/reset-password`);
      }, 1000);
      
    } catch (err: any) {
      setError(err.message || "Invalid OTP or expired.");
      setIsLoading(false);
    }
  };

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#020617]">
        <div className="glass-panel rounded-3xl p-8 text-center">
          <p className="mb-4 text-slate-600 dark:text-slate-400">No email provided.</p>
          <Link href="/forgot-password" className="font-semibold text-ruet-blue hover:underline dark:text-ruet-gold">Go back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 selection:bg-ruet-gold selection:text-black dark:bg-[#020617]">
      <div className="absolute top-1/4 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[120px] dark:bg-ruet-blue/30"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-ruet-gold/10 blur-[100px] dark:bg-ruet-gold/15"></div>

      <div className="w-full max-w-md px-4 sm:px-0">
        <div className="glass-panel overflow-hidden rounded-3xl p-8 transition-all duration-500">
          
          <Link href="/forgot-password" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft size={16} />
            Back to email
          </Link>

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Enter Code</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              We sent a 6-digit code to <br/><span className="font-semibold text-slate-900 dark:text-white">{email}</span>.
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

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="otp" className="text-sm font-medium text-slate-700 dark:text-slate-300">6-Digit Code</label>
              <input
                type="text"
                id="otp"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Restrict to numbers
                placeholder="123456"
                className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold dark:focus:ring-ruet-gold"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify Code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}