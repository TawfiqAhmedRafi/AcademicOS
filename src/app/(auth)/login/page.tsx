"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight, UploadCloud, Lock, Mail, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Dynamic fallback: If they didn't try to access a protected route, send them home.
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const urlError = searchParams.get("error");

  // Step Management
  const [step, setStep] = useState<"login" | "setup">("login");
  
  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  
  // UI Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Handle URL errors passed from NextAuth
  useEffect(() => {
    if (urlError === "CredentialsSignin") {
      setErrorMsg("Invalid email or password");
    } else if (urlError) {
      setErrorMsg("An error occurred during authentication. Please try again.");
    }
  }, [urlError]);

  // ==========================================
  // STEP 1: Handle Initial Login Attempt
  // ==========================================
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      if (res.error === "NEEDS_SETUP") {
        // Intercepted! The user has a temporary password and needs to complete setup
        setStep("setup");
      } else if (res.error === "CredentialsSignin") {
        setErrorMsg("Invalid email or password"); // Standard failure
      } else {
        // Displays custom errors like the 30-minute lockout
        setErrorMsg(res.error); 
      }
      setIsLoading(false);
    } else {
      // Normal login successful
      router.push(callbackUrl);
    }
  };

  // ==========================================
  // STEP 2: Handle First-Time Setup & Upload
  // ==========================================
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setErrorMsg("Please select a profile photo.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Your new password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      // 1. Prepare FormData for Cloudinary Unsigned Upload
      const formData = new FormData();
      formData.append("file", photo);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string);

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      
      // 2. Upload directly to Cloudinary
      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudData = await cloudinaryRes.json();

      if (!cloudinaryRes.ok) {
        throw new Error(cloudData.error?.message || "Failed to upload image");
      }

      const profilePhotoUrl = cloudData.secure_url;

      // 3. Send setup data to our custom backend endpoint
      const setupRes = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          tempPassword: password, 
          newPassword, 
          profilePhotoUrl 
        })
      });

      const setupData = await setupRes.json();

      if (!setupRes.ok) {
        throw new Error(setupData.message || "Failed to finalize account setup.");
      }

      setSuccessMsg("Setup complete! Logging you in...");

      // 4. Finally, sign in via NextAuth using the newly set credentials
      const finalSignIn = await signIn("credentials", {
        redirect: false,
        email,
        password: newPassword,
      });

      if (finalSignIn?.error) {
        throw new Error("Setup succeeded, but automatic login failed. Please refresh and log in.");
      }

      router.push(callbackUrl);

    } catch (error: any) {
      setErrorMsg(error.message || "An error occurred during setup.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 selection:bg-ruet-gold selection:text-black dark:bg-[#020617]">
      {/* Cinematic Ambient Lighting */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[120px] dark:bg-ruet-blue/30"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-ruet-gold/10 blur-[100px] dark:bg-ruet-gold/15"></div>

      <div className="w-full max-w-md px-4 sm:px-0">
        
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Academic <span className="text-ruet-gold">OS</span>
          </Link>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Department of Electronics & Telecommunication Engineering
          </p>
        </div>

        {/* The Glassmorphic Card */}
        <div className="glass-panel overflow-hidden rounded-3xl p-8 transition-all duration-500">
          
          {errorMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-ruet-green/10 p-3 text-sm font-medium text-ruet-green dark:bg-ruet-green/20 dark:text-emerald-400">
              <CheckCircle2 size={16} />
              {successMsg}
            </div>
          )}

          {step === "login" ? (
            // --- STEP 1: STANDARD LOGIN ---
            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Institutional Login</h2>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="2204047@student.ruet.ac.bd"
                    className="w-full rounded-xl border border-slate-300 bg-white/50 py-3 pl-10 pr-4 text-sm focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold dark:focus:ring-ruet-gold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-300 bg-white/50 py-3 pl-10 pr-12 text-sm focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold dark:focus:ring-ruet-gold"
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

              <button disabled={isLoading} type="submit" className="mt-2 group flex w-full items-center justify-center gap-2 rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : (
                  <>
                    Sign In
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

          ) : (
            // --- STEP 2: FIRST-TIME SETUP ---
            <form onSubmit={handleSetupSubmit} className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome!</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Please complete your profile to secure your account.</p>
              </div>

              {/* Photo Upload Area */}
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-white/30 p-6 transition-colors hover:border-ruet-blue dark:border-white/20 dark:bg-black/20 dark:hover:border-ruet-gold">
                <div className="rounded-full bg-slate-100 p-3 dark:bg-white/10">
                  <UploadCloud className="text-ruet-blue dark:text-ruet-gold" size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Upload Profile Photo</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">JPG or PNG, max 5MB</p>
                </div>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg"
                  className="w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-ruet-blue/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ruet-blue hover:file:bg-ruet-blue/20 dark:file:bg-ruet-gold/10 dark:file:text-ruet-gold dark:hover:file:bg-ruet-gold/20"
                  onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                  required
                />
              </div>

              {/* Secure Password Area */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Set Permanent Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    className="w-full rounded-xl border border-slate-300 bg-white/50 py-3 pl-10 pr-12 text-sm focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold dark:focus:ring-ruet-gold"
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

              <button disabled={isLoading} type="submit" className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white transition-all hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  "Complete Setup & Enter Portal"
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>}>
      <LoginForm />
    </Suspense>
  );
}