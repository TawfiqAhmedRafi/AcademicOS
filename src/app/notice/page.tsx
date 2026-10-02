"use client";

import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Loader2, Megaphone, Bell, ShieldAlert, X, Send, Trash2, Globe, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import DropdownFilter from "../components/DropdownFilter";
import { useToast } from "@/app/components/ToastProvider";
import Swal from "sweetalert2";

export default function NoticeBoardPage() {
  const { data: session } = useSession();
  const isHead = session?.user?.role === "dept_head";

  const [notices, setNotices] = useState<any[]>([]);
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // <-- NEW: Search state

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetSeries, setTargetSeries] = useState("all");
  const { showToast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const [noticesRes, seriesRes] = await Promise.all([
      fetch("/api/notices"),
      isHead ? fetch("/api/head/series") : Promise.resolve(null)
    ]);
    if (noticesRes.ok) setNotices(await noticesRes.json());
    if (seriesRes && seriesRes.ok) setSeriesList(await seriesRes.json());
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, [isHead]);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await fetch("/api/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, series: targetSeries })
    });
    if (res.ok) {
      showToast("Notice broadcasted successfully", "success");
      setIsModalOpen(false);
      setTitle("");
      setContent("");
      fetchData();
    } else {
      showToast("Failed to post notice", "error");
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Notice?",
      text: "This will permanently remove it from the board.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    await fetch(`/api/notices?id=${id}`, { method: "DELETE" });
    showToast("Notice deleted", "success");
    fetchData();
  };

  const seriesOptions = [
    { label: "Broadcast to All Series", value: "all" },
    ...seriesList.map(s => ({ label: `Series ${s.series} Only`, value: s.series }))
  ];

  // --- NEW: Filter logic for the Archive ---
  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 dark:bg-[#020617] selection:bg-ruet-gold selection:text-black">
      <Navbar />
      <div className="fixed top-1/4 left-1/4 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[150px] dark:bg-ruet-blue/20"></div>
      
      <main className="flex-1 w-full pt-28 pb-16 px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="mx-auto max-w-7xl">
          
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl flex items-center gap-4">
                Notice <span className="text-ruet-blue dark:text-ruet-gold">Archive</span>
              </h1>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
                Official broadcasts, deadlines, and system events.
              </p>
            </div>
            {isHead && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-ruet-blue hover:bg-blue-900 text-white dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 px-6 py-3 rounded-xl font-bold shadow-lg transition-all"
              >
                <Megaphone size={18} /> Post New Notice
              </button>
            )}
          </div>

          {/* --- NEW: Search Bar --- */}
          <div className="mb-8 relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search notices by keyword..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/60 py-3.5 pl-12 pr-4 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold shadow-sm backdrop-blur-md"
            />
          </div>

          {isLoading ? (
            <div className="flex h-[40vh] items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={40} /></div>
          ) : filteredNotices.length === 0 ? (
            <div className="glass-panel py-24 text-center rounded-3xl flex flex-col items-center">
              <Bell size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">No Notices Found</h2>
              <p className="text-slate-500 mt-2">Try adjusting your search keywords.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNotices.map((notice) => (
                <div key={notice._id} className="glass-panel rounded-3xl p-6 relative overflow-hidden transition-transform hover:-translate-y-1 flex flex-col justify-between">
                  
                  {notice.type === "system" && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-bl-[100px] flex items-start justify-end p-3">
                      <ShieldAlert size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${notice.type === 'system' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-ruet-blue/10 text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold'}`}>
                        {notice.type === 'system' ? 'System Auto-Generated' : 'Official Notice'}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        {notice.series === "all" ? <><Globe size={10}/> All Series</> : `Target: Series ${notice.series}`}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 pr-8">{notice.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-200 dark:border-white/10">
                    <span className="text-xs font-semibold text-slate-400">
                      {new Date(notice.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </span>
                    
                    {/* FIX: Removed the notice.type === "manual" restriction here! */}
                    {isHead && (
                      <button onClick={() => handleDelete(notice._id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors p-1" title="Delete Notice">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* MODAL: POST NOTICE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a] animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Megaphone size={20} className="text-ruet-blue dark:text-ruet-gold"/> Post Notice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Target Audience</label>
                <div className="relative z-40">
                  <DropdownFilter fullWidth icon={<Globe size={16}/>} options={seriesOptions} value={targetSeries} onChange={setTargetSeries} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Headline</label>
                <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="e.g., Mandatory Board Viva Rescheduled" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Detailed Message</label>
                <textarea required value={content} onChange={e => setContent(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white custom-scrollbar" placeholder="Provide full details, room numbers, or instructions here..."></textarea>
              </div>
              <button disabled={isSubmitting} type="submit" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-ruet-blue px-4 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-70 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />} Broadcast Notice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}