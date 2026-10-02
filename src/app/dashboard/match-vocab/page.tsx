"use client";

import { useState, useEffect } from "react";
import { Plus, Trash, Check, X, RefreshCcw, Loader2 } from "lucide-react";
import Navbar from "@/app/components/Navbar";
import DropdownFilter from "../../components/DropdownFilter";
import Pagination from "../../components/Pagination";
import { useToast } from "../../components/ToastProvider";
import Swal from "sweetalert2";

type Vocab = {
  _id: string;
  kind: "synonym" | "phrase" | "stopword";
  from: string;
  to: string;
  enabled: boolean;
};

export default function MatchVocabPage() {
  const { showToast } = useToast();
  const [vocab, setVocab] = useState<Vocab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // New item form
  const [kind, setKind] = useState<Vocab["kind"]>("synonym");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [reindexing, setReindexing] = useState(false);

  useEffect(() => {
    fetchVocab();
  }, []);

  const fetchVocab = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/match-vocab");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVocab(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(vocab.length / itemsPerPage);
  const currentVocab = vocab.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/match-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", item: { kind, from, to, enabled: true } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFrom("");
      setTo("");
      fetchVocab();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleToggle = async (item: Vocab) => {
    try {
      await fetch("/api/admin/match-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", item: { ...item, enabled: !item.enabled } }),
      });
      fetchVocab();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
  title: "Delete this rule?",
  text: "This action cannot be undone.",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Yes, delete it",
  cancelButtonText: "Cancel",
  reverseButtons: true,
});

if (!result.isConfirmed) return;
    try {
      await fetch("/api/admin/match-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", item: { _id: id } }),
      });
      fetchVocab();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReindex = async () => {
const result = await Swal.fire({
  title: "Rebuild Search Engine?",
  text: "This will rebuild the search engine using the latest vocabulary. Proceed?",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Yes, rebuild",
  cancelButtonText: "Cancel",
  reverseButtons: true,
});

if (!result.isConfirmed) return;

    setReindexing(true);
    try {
      const res = await fetch("/api/match/reindex", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Index rebuilt successfully! (Items loaded: ${data.items})`, "success");
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Search Vocabulary</h1>
            <p className="text-gray-500 mt-1">Manage custom synonyms, phrase mapping, and stopwords.</p>
          </div>
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="w-full md:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
          >
            {reindexing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            Reindex Engine
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add New Rule</h2>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row flex-wrap items-stretch md:items-end gap-4">
            <div className="space-y-1 w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Kind</label>
              <DropdownFilter
                value={kind}
                onChange={(val) => setKind(val as any)}
                options={[
                  { label: "Synonym (single word)", value: "synonym" },
                  { label: "Phrase (multi-word)", value: "phrase" },
                  { label: "Stopword (ignored)", value: "stopword" }
                ]}
              />
            </div>
            
            <div className="space-y-1 flex-1 w-full md:w-auto">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                From {kind === "phrase" ? "(regex allowed)" : ""}
              </label>
              <input
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder={kind === "stopword" ? "e.g., using" : "e.g., machine learning"}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500"
                required
              />
            </div>

            {kind !== "stopword" && (
              <div className="space-y-1 flex-1 w-full md:w-auto">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                <input
                  type="text"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={kind === "synonym" ? "e.g., ml (single token)" : "e.g., ml"}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            <button type="submit" className="w-full md:w-auto justify-center bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-white text-white dark:text-gray-900 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 h-[42px]">
              <Plus size={18} /> Add
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-medium border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Kind</th>
                <th className="px-6 py-4">From</th>
                <th className="px-6 py-4">To</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
              {currentVocab.map(v => (
                <tr key={v._id} className={v.enabled ? "text-gray-900 dark:text-gray-100" : "text-gray-400 dark:text-gray-500"}>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggle(v)} className="flex items-center gap-2">
                      {v.enabled ? <Check size={16} className="text-green-500" /> : <X size={16} />}
                    </button>
                  </td>
                  <td className="px-6 py-4 capitalize font-medium">{v.kind}</td>
                  <td className="px-6 py-4 font-mono text-xs">{v.from}</td>
                  <td className="px-6 py-4 font-mono text-xs">{v.to || "-"}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(v._id)} className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {vocab.length === 0 && !loading && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No custom vocabulary rules yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && vocab.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mt-6 flex justify-center">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}

    </div>
  );
}
