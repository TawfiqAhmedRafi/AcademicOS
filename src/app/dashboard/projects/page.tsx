"use client";

import { useState, useEffect } from "react";
import DropdownFilter from "@/app/components/DropdownFilter";
import Pagination from "@/app/components/Pagination";
import { Loader2, Search, Database, User } from "lucide-react";
import { toast } from "react-hot-toast";

export default function ProjectsThesisPage() {
  const [target, setTarget] = useState<string>("all");
  const [series, setSeries] = useState<string>("all");
  
  const [availableSeries, setAvailableSeries] = useState<string[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch available series when target changes
  useEffect(() => {
    if (target === "all") {
      setAvailableSeries([]);
      setSeries("all");
      return;
    }
    
    // Fetch from match scopes to know what series exist
    fetch("/api/match/scopes")
      .then((res) => res.json())
      .then((data) => {
        let type = "project";
        let course = "";
        if (target === "2200") course = "ETE2200";
        if (target === "3200") course = "ETE3200";
        if (target === "thesis") type = "thesis";
        
        let found = [];
        if (type === "thesis") {
           const scope = data.find((d: any) => d.type === "thesis");
           if (scope) found = scope.series;
        } else {
           // match engine course uses "2200" instead of "ETE2200"
           const scope = data.find((d: any) => d.type === "project" && d.course === target);
           if (scope) found = scope.series;
        }
        setAvailableSeries(found);
        setSeries("all");
        setPage(1);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [target]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/faculty/match-items?target=${target}&series=${series}&page=${page}&limit=60`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items);
      setTotalPages(data.pages);
      setTotalItems(data.total);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [target, series, page]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 rounded-xl">
          <Database size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects & Thesis Repository</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Browse all records stored in the semantic search database.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-wrap items-center gap-4">
        <div className="w-full md:w-64">
          <label className="block text-sm font-medium text-gray-500 mb-2">Select Category</label>
          <DropdownFilter
            value={target}
            onChange={(val) => {
              setTarget(val);
              setPage(1);
            }}
            options={[
              { label: "All Records", value: "all" },
              { label: "Projects ETE 2200", value: "2200" },
              { label: "Projects ETE 3200", value: "3200" },
              { label: "Thesis ETE 4200", value: "thesis" }
            ]}
            fullWidth
          />
        </div>

        {target !== "all" && (
          <div className="w-full md:w-64 animate-in fade-in zoom-in duration-300">
            <label className="block text-sm font-medium text-gray-500 mb-2">Select Series</label>
            <DropdownFilter
              value={series}
              onChange={(val) => {
                setSeries(val);
                setPage(1);
              }}
              options={[
                { label: "All Series", value: "all" },
                ...availableSeries.map(s => ({ label: `Series ${s}`, value: s }))
              ]}
              fullWidth
            />
          </div>
        )}
      </div>

      {/* Data Table / List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-blue-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="text-gray-500">Loading records...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Search className="text-gray-300 mb-4" size={48} />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">No records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 w-[25%] sm:w-1/4">Identity</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 w-[60%] sm:w-auto">Title & Description</th>
                  <th className="py-4 px-6 font-semibold text-gray-600 dark:text-gray-300 w-[15%] whitespace-nowrap">Type / Series</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                    <td className="py-4 px-6 align-top min-w-[200px]">
                      {item.studentName ? (
                        <div className="mb-2">
                           <div className="font-medium text-gray-900 dark:text-gray-100">{item.studentName}</div>
                           <div className="text-sm text-gray-500">{item.student_id || item.roll}</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                           {(item.members || [item.student_id]).filter(Boolean).map((roll: string, i: number) => (
                              <div key={i} className="flex items-start gap-2">
                                 <User size={14} className="text-gray-400 mt-1" />
                                 <div>
                                    <div className="font-medium text-gray-900 dark:text-gray-100">
                                       {item.memberNames?.[i] || "Unknown Name"}
                                    </div>
                                    <div className="text-sm text-gray-500">{roll}</div>
                                 </div>
                              </div>
                           ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{item.description}</p>
                      
                      {item.tags?.domain && item.tags.domain.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {item.tags.domain.map((d: string, i: number) => (
                            <span key={i} className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 align-top">
                      <div className="flex flex-col gap-2">
                         <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium text-xs rounded-full whitespace-nowrap text-center">
                            {item.course}
                         </span>
                         <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-medium text-xs rounded-full whitespace-nowrap text-center">
                            Series {item.series}
                         </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 mt-6">
          <p className="text-sm text-gray-500 text-center sm:text-left">
            Showing <span className="font-semibold">{Math.min((page - 1) * 60 + 1, totalItems)}</span> to <span className="font-semibold">{Math.min(page * 60, totalItems)}</span> of <span className="font-semibold">{totalItems}</span> records
          </p>
          <Pagination 
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
