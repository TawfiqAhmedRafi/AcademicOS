"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Camera, KeyRound, Mail, CheckCircle2, ShieldCheck } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Image from "next/image";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    const res = await fetch("/api/user/settings/otp", { method: "POST" });
    if (res.ok) {
      setIsOtpSent(true);
      showToast("OTP sent securely to your registered email.", "success");
    } else {
      showToast("Failed to send OTP. Please try again.", "error");
    }
    setIsSendingOtp(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return showToast("Passwords do not match.", "error");
    if (newPassword.length < 6) return showToast("Password must be at least 6 characters.", "error");

    setIsUpdatingPassword(true);
    const res = await fetch("/api/user/settings/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp, newPassword })
    });

    if (res.ok) {
      showToast("Password updated successfully. Security locked.", "success");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setIsOtpSent(false);
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to update password.", "error");
    }
    setIsUpdatingPassword(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    showToast("Uploading profile photo...", "info");

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dtdafyhxr";
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "cropdoc_unsigned";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const cloudinaryRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudinaryData = await cloudinaryRes.json();
      if (!cloudinaryRes.ok) {
        throw new Error(cloudinaryData.error?.message || "Cloudinary upload failed");
      }

      const secureUrl = cloudinaryData.secure_url;

      // Save the Cloudinary secure URL to your MongoDB database
      const res = await fetch("/api/user/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: secureUrl }) // Reusing the parameter name for compatibility
      });

      if (res.ok) {
        await update(); // Refreshes the session and UI avatars across the entire OS!
        showToast("Profile photo updated successfully.", "success");
      } else {
        throw new Error("Failed to save photo URL to database");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload photo.", "error");
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!session?.user) return null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Account Settings</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Manage your profile aesthetics and security credentials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Photo Upload Section */}
        <div className="glass-panel rounded-3xl p-8 flex flex-col items-center justify-center md:col-span-1 border-t-4 border-t-ruet-blue dark:border-t-ruet-gold">
          <div className="relative mb-6">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-xl relative">
              {session.user.image ? (
                <Image src={session.user.image} alt="Profile" fill className="object-cover" />
              ) : (
                <div className="h-full w-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-500">
                  {session.user.name?.charAt(0) || "U"}
                </div>
              )}
              {isUploadingPhoto && (
                <div className="absolute inset-0 bg-white/60 dark:bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={24} />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 bg-ruet-blue dark:bg-ruet-gold text-white dark:text-black p-3 rounded-full shadow-lg hover:scale-105 transition-transform"
            >
              <Camera size={18} />
            </button>
            <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" ref={fileInputRef} onChange={handlePhotoUpload} />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">{session.user.name}</h3>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{session.user.role.replace("_", " ")}</p>
        </div>

        {/* Security & Password Section */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 md:col-span-2">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="bg-slate-100 dark:bg-white/10 p-2.5 rounded-xl text-slate-600 dark:text-slate-300">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Security Integrity</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Update your access credentials via registered email OTP.</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-black/20 rounded-2xl p-5 mb-8 border border-slate-200 dark:border-white/10 flex items-center gap-4">
            <ShieldCheck size={28} className="text-emerald-500" />
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Protected Account</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your account is bound to <span className="font-bold text-slate-700 dark:text-slate-300">{session.user.email}</span></p>
            </div>
          </div>

          {!isOtpSent ? (
            <button 
              onClick={handleSendOtp} 
              disabled={isSendingOtp}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white dark:bg-white dark:text-black font-bold rounded-xl px-4 py-3.5 transition-all shadow-lg hover:scale-[1.01] disabled:opacity-70"
            >
              {isSendingOtp ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} 
              {isSendingOtp ? "Generating Secure Token..." : "Send Verification OTP to Email"}
            </button>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in duration-500">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">6-Digit OTP</label>
                <input required type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" className="w-full mt-1.5 rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-center text-xl font-mono tracking-[0.5em] focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">New Password</label>
                  <input required type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full mt-1.5 rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Confirm Password</label>
                  <input required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full mt-1.5 rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" />
                </div>
              </div>
              <button disabled={isUpdatingPassword} type="submit" className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold rounded-xl px-4 py-3.5 transition-all shadow-lg hover:bg-emerald-700 disabled:opacity-70 dark:bg-emerald-500 dark:hover:bg-emerald-600">
                {isUpdatingPassword ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Update Password
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}