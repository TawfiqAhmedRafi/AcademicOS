"use client";

import { useState, useEffect } from "react";
<<<<<<< HEAD
import { Search, Loader2, UserMinus, GraduationCap, ArrowDownRight, XCircle } from "lucide-react";
import { useToast } from "../../components/ToastProvider";
import Pagination from "../../components/Pagination";
=======
import { Search, Loader2, UserMinus, GraduationCap, ArrowDownRight, XCircle, Filter } from "lucide-react";
import { useToast } from "@/app/components/ToastProvider";
import DropdownFilter from "@/app/components/DropdownFilter";
>>>>>>> a9e8e4c82dc0efb15c014ef7fe7000722978438b
import Swal from "sweetalert2";

type Student = {
  _id: string;
  name: string;
  email: string;
  series: string;
  studentId?: string;
};

export default function StudentManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  
  // Modal State
  const [dropModal, setDropModal] = useState<Student | null>(null);
  const [newSeries, setNewSeries] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 60;

  const { showToast } = useToast();

  const fetchStudents = async () => {
    setIsLoading(true);
    const res = await fetch("/api/head/students");
    if (res.ok) {
      setStudents(await res.json());
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleYearDrop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dropModal || !newSeries) return;

    const result = await Swal.fire({
      title: "Transfer Student?",
      text: `WARNING: You are transferring ${dropModal.name} from Series ${dropModal.series} to Series ${newSeries}. This will instantly move them to a new Advisor's roster. Proceed?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, transfer",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    const res = await fetch("/api/head/students", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "year_drop", 
        studentId: dropModal._id, 
        studentName: dropModal.name,
        newSeries 
      })
    });

    if (res.ok) {
      showToast(`${dropModal.name} transferred to Series ${newSeries}`, "success");
      setDropModal(null);
      setNewSeries("");
      fetchStudents();
    } else {
      showToast("Failed to process year drop", "error");
    }
    setIsSubmitting(false);
  };

  // Dynamically extract all unique series from the students list
  const uniqueSeries = Array.from(
    new Set(students.map((s) => s.series).filter(Boolean))
  ).sort((a, b) => Number(b) - Number(a));

  const seriesOptions = [
    { label: "All Series", value: "all" },
    ...uniqueSeries.map((s) => ({ label: `Series ${s}`, value: s })),
  ];

  // Apply both the search query and the series filter
  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.series.includes(search);
    
    const matchesSeries = seriesFilter === "all" || s.series === seriesFilter;

    return matchesSearch && matchesSeries;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const currentStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Student Directory</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Manage year drops, suspensions, and batch transfers.</p>
      </div>

      {/* Control Bar: Search & Series Filter */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by roll, name, or series..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white/50 py-2.5 pl-10 pr-4 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold"
          />
        </div>
        <div className="w-full sm:w-auto relative z-40">
          <DropdownFilter
            icon={<Filter size={16} />}
            options={seriesOptions}
            value={seriesFilter}
            onChange={setSeriesFilter}
          />
        </div>
      </div>

      <div className="glass-panel overflow-hidden rounded-3xl">
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center gap-3">
          <GraduationCap size={20} className="text-ruet-blue dark:text-ruet-gold" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Undergraduate Students</h3>
        </div>
        
        {isLoading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-ruet-blue dark:text-ruet-gold" size={32} /></div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Roll Number</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Student Name</th>
                  <th className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-300">Active Series</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No students found matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const roll = student.studentId || student.email.split('@')[0];
                    return (
                      <tr key={student._id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 dark:text-white">{roll}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900 dark:text-white">{student.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{student.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-bold">
                            Series {student.series}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setDropModal(student)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors"
                          >
                            <ArrowDownRight size={14} /> Process Year Drop
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {!isLoading && filteredStudents.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Year Drop Modal */}
      {dropModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a] animate-in zoom-in-95">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Process Year Drop</h2>
              <button onClick={() => setDropModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><XCircle size={20} /></button>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Target: {dropModal.name} ({dropModal.email.split('@')[0]})</p>
              <p className="text-xs text-amber-700 dark:text-amber-400">They are currently registered under <strong>Series {dropModal.series}</strong>.</p>
            </div>

            <form onSubmit={handleYearDrop} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reassign to New Series (e.g. 24)</label>
                <input 
                  type="text" 
                  required
                  value={newSeries}
                  onChange={(e) => setNewSeries(e.target.value)}
                  placeholder="24"
                  className="w-full mt-1.5 rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white"
                />
              </div>
              <button 
                type="submit"
                disabled={isSubmitting || !newSeries}
                className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <UserMinus size={18}/>}
                Execute Transfer
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}