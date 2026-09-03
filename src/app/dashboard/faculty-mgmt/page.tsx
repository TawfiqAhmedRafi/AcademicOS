"use client";

import { useState, useEffect } from "react";
import { UserPlus, Star, Mail, Loader2, X, Briefcase, GraduationCap, ChevronUp } from "lucide-react";
import DropdownFilter from "@/app/components/DropdownFilter";
import { useToast } from "@/app/components/ToastProvider";
type Faculty = {
  _id: string;
  name: string;
  email: string;
  designation: string;
  role: string;
  needs_setup: boolean;
};

const designationOptions = [
  { label: "Lecturer", value: "Lecturer" },
  { label: "Assistant Professor", value: "Assistant Professor" },
  { label: "Associate Professor", value: "Associate Professor" },
  { label: "Professor", value: "Professor" },
];

const rankHierarchy = ["Lecturer", "Assistant Professor", "Associate Professor", "Professor"];

export default function FacultyManagement() {
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDesignation, setNewDesignation] = useState("Lecturer");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();
  const fetchFaculties = async () => {
    setIsLoading(true);
    const res = await fetch("/api/admin/faculty");
    if (res.ok) {
      const data = await res.json();
      setFaculties(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFaculties();
  }, []);

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
         
    const res = await fetch("/api/admin/faculty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, email: newEmail, designation: newDesignation }),
    });
    
    if (res.ok) {
      setIsAddModalOpen(false);
      setNewName("");
      setNewEmail("");
      setNewDesignation("Lecturer");
      showToast("Faculty account created successfully.", "success");
      fetchFaculties(); 
    } else {
      // 3. Replace the alert
      showToast("Failed to add faculty. Email might already exist.", "error");
    }
    setIsSubmitting(false);
  };

  const handlePromoteToHead = async (userId: string, name: string) => {
    if (!confirm(`Make ${name} the new Department Head? The current Head will be stepped down.`)) return;
    
    const res = await fetch("/api/admin/faculty", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "promote_head", userId, newRole: "dept_head" }),
    });

    if (res.ok) fetchFaculties();
  };

  const handlePromoteRank = async (fac: Faculty) => {
    const currentRankIndex = rankHierarchy.indexOf(fac.designation);
    const nextRank = rankHierarchy[currentRankIndex + 1];
    
    if (!nextRank) return; // Safety check

    if (!confirm(`Promote ${fac.name} to ${nextRank}?`)) return;

    const res = await fetch("/api/admin/faculty", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "update_designation", 
        userId: fac._id, 
        newDesignation: nextRank 
      }),
    });

    if (res.ok) fetchFaculties();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Faculty Management</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Provision accounts, step-promote academic ranks, and assign the Head of Department.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-ruet-blue px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400"
        >
          <UserPlus size={18} /> Add Faculty
        </button>
      </div>

      {/* Faculty Table */}
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
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Name & Designation</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Contact Info</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">System Role</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {faculties.map((fac) => {
                  const currentRankIndex = rankHierarchy.indexOf(fac.designation);
                  const nextRank = rankHierarchy[currentRankIndex + 1];

                  return (
                    <tr key={fac._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
                      
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{fac.name}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-ruet-blue dark:text-ruet-gold">
                          <GraduationCap size={14} /> {fac.designation}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                          <Mail size={14} className="text-slate-400" /> {fac.email}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2 items-start">
                          {/* Force Advisors to visually display as standard Faculty */}
                          {fac.role === "dept_head" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ruet-blue/10 px-2.5 py-1 text-xs font-bold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                              <Star size={12} className="fill-current" /> Dept Head
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              Faculty
                            </span>
                          )}
                          
                          {fac.needs_setup && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" title="User must log in and change their password">
                              Setup Pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right space-x-3">
                        {/* Progressive Promotion Button */}
                        {nextRank && (
                          <button 
                            onClick={() => handlePromoteRank(fac)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
                            title={`Promote to ${nextRank}`}
                          >
                            <ChevronUp size={14} /> Promote
                          </button>
                        )}
                        
                        {fac.role !== "dept_head" && (
                          <button 
                            onClick={() => handlePromoteToHead(fac._id, fac.name)}
                            className="text-xs font-bold text-ruet-blue hover:underline dark:text-ruet-gold"
                          >
                            Make Dept Head
                          </button>
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

      {/* MODAL: ADD FACULTY */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a] animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Provision Faculty Account</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddFaculty} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                <input required value={newName} onChange={e => setNewName(e.target.value)} type="text" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="Dr. John Doe" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Institutional Email</label>
                <input required value={newEmail} onChange={e => setNewEmail(e.target.value)} type="email" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="john.doe@ete.ruet.ac.bd" />
              </div>
              
              <div className="relative z-40">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Initial Designation</label>
                <DropdownFilter 
                  icon={<Briefcase size={16}/>} 
                  options={designationOptions} 
                  value={newDesignation} 
                  onChange={setNewDesignation} 
                />
              </div>

              <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-400">
                <p><strong>Note:</strong> The user will receive the temporary password (<code>their respective email</code>). The <span className="font-bold text-amber-600 dark:text-amber-400">Setup Pending</span> flag will force them to secure their account on first login.</p>
              </div>

              <button disabled={isSubmitting} type="submit" className="mt-4 flex w-full items-center justify-center rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}