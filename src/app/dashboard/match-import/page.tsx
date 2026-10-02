"use client";

import { useEffect, useState } from "react";
import { useToast } from "../../components/ToastProvider"
import { Loader2, UploadCloud, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

type SeriesConfig = {
  series: string;
  currentSemester: string;
};

export default function MatchImportPage() {
  const [seriesData, setSeriesData] = useState<SeriesConfig[]>([]);
  const [activeSeries, setActiveSeries] = useState("");
  const [activeTab, setActiveTab] = useState<"2200" | "3200" | "thesis">("2200");
  const [loading, setLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState({
    "2200": false,
    "3200": false,
    thesis: false,
  });

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedData, setUploadedData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    fetch("/api/advisor/roster")
      .then((res) => res.json())
      .then((data) => {
        if (data.seriesData && data.seriesData.length > 0) {
          setSeriesData(data.seriesData);
          setActiveSeries(data.seriesData[0].series);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (activeSeries) {
      setFile(null); // Reset file on series change
      fetch(`/api/advisor/match-import-status?series=${activeSeries}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            setUploadStatus(data);
          }
        })
        .catch(console.error);
    }
  }, [activeSeries]);

  useEffect(() => {
    if (activeSeries && uploadStatus[activeTab]) {
      setLoadingData(true);
      const course = activeTab === "thesis" ? "ETE4200" : `ETE${activeTab}`;
      const type = activeTab === "thesis" ? "thesis" : "project";
      fetch(`/api/advisor/match-import-data?series=${activeSeries}&course=${course}&type=${type}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.items) {
            setUploadedData(data.items);
          }
        })
        .finally(() => setLoadingData(false));
    } else {
      setUploadedData([]);
    }
  }, [activeSeries, activeTab, uploadStatus]);

  const activeConfig = seriesData.find((s) => s.series === activeSeries);

  const getLevel = (semester: string) => {
    if (!semester) return 0;
    if (semester.toLowerCase().includes("grad")) return 99;
    const match = semester.match(/(\d)-(\d)/);
    if (match) {
      return parseInt(match[1]) * 10 + parseInt(match[2]);
    }
    return 0;
  };

  const level = activeConfig ? getLevel(activeConfig.currentSemester) : 0;

  // Locks:
  // 2200 unlocks at 3-1 (level >= 31)
  // 3200 unlocks at 4-1 (level >= 41)
  // thesis unlocks after graduation (level >= 99)
  const is2200Locked = level < 31;
  const is3200Locked = level < 41;
  const isThesisLocked = level < 99; // assuming 'graduated' sets level to 99

  const isCurrentTabLocked = 
    activeTab === "2200" ? is2200Locked : 
    activeTab === "3200" ? is3200Locked : 
    isThesisLocked;
    
  const isCurrentTabUploaded = uploadStatus[activeTab];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.match(/\.(xlsx|xls|csv)$/)) {
        showToast("Only Excel or CSV files are allowed", "error");
        return;
      }
      setFile(f);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setUploading(true);
    
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (json.length === 0) {
        throw new Error("File is empty.");
      }

      // Map columns heuristically
      const items = json.map((row: any) => {
        // Lowercase keys to find them easily
        const lowerRow: any = {};
        for (const key in row) {
          lowerRow[key.toLowerCase().trim()] = row[key];
        }

        const roll = lowerRow["roll"] || lowerRow["student_id"] || lowerRow["id"] || "";
        const title = lowerRow["title"] || lowerRow["project title"] || lowerRow["thesis title"] || "";
        const abstract = lowerRow["abstract"] || lowerRow["description"] || lowerRow["project description"] || "";

        return { roll: String(roll), title: String(title), abstract: String(abstract) };
      }).filter((i) => i.roll && i.title); // Skip empty rows

      if (items.length === 0) {
        throw new Error("Could not find 'roll' and 'title' columns. Please check the Excel format.");
      }

      const res = await fetch("/api/advisor/match-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: activeSeries,
          type: activeTab === "thesis" ? "thesis" : "project",
          course: activeTab === "thesis" ? "4200" : activeTab,
          items
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Successfully uploaded ${data.count} records!`, "success");
      setFile(null);
      setUploadStatus(prev => ({ ...prev, [activeTab]: true }));

    } catch (err: any) {
      showToast(err.message || "Failed to process file", "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12 text-blue-500">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (seriesData.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        You are not assigned as an advisor for any active series.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Project & Thesis Upload</h1>
          <p className="text-gray-500 mt-1">Upload records to feed the AcademicOS Match Engine.</p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 w-full md:w-auto">
          <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">Series</span>
          <span className="text-lg font-bold text-gray-900 dark:text-white px-2">
            {activeSeries}
          </span>
        </div>
      </div>

      {activeConfig && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            {(["2200", "3200", "thesis"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setFile(null);
                }}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${
                  activeTab === tab
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                    : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab === "thesis" ? "Thesis" : `ETE ${tab}`}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400" />}
              </button>
            ))}
          </div>

          <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {activeTab === "thesis" ? "Thesis Records" : `ETE ${activeTab} Projects`}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Series {activeSeries} is currently in Semester: <span className="font-bold text-gray-700 dark:text-gray-300">{activeConfig.currentSemester}</span>
                </p>
              </div>
              
              {isCurrentTabUploaded ? (
                <div className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg text-sm font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Already Uploaded
                </div>
              ) : isCurrentTabLocked ? (
                <div className="px-3 py-1.5 bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400 rounded-lg text-sm font-bold flex items-center gap-1.5">
                  <Lock size={16} /> Locked
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg text-sm font-bold flex items-center gap-1.5">
                  <UploadCloud size={16} /> Ready to Upload
                </div>
              )}
            </div>

            {isCurrentTabLocked && !isCurrentTabUploaded && (
              <div className="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700 text-center">
                <Lock size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">Upload Locked</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {activeTab === "2200" && "ETE 2200 project upload unlocks when the series reaches 3-1."}
                  {activeTab === "3200" && "ETE 3200 project upload unlocks when the series reaches 4-1."}
                  {activeTab === "thesis" && "Thesis upload unlocks after the series has graduated."}
                </p>
              </div>
            )}

            {isCurrentTabUploaded && (
              <div className="space-y-6">
                <div className="p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-100 dark:border-green-900 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
                  <CheckCircle2 size={36} className="text-green-500 shrink-0" />
                  <div>
                    <h3 className="text-lg font-bold text-green-800 dark:text-green-400">Upload Complete</h3>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      The records for {activeTab} have already been successfully uploaded and processed by the Match Engine.
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300">Database Records</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/80">
                        <tr>
                          <th className="px-4 py-3 whitespace-nowrap">Student ID</th>
                          <th className="px-4 py-3 min-w-[200px]">Title</th>
                          <th className="px-4 py-3 min-w-[300px]">Description / Abstract</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {loadingData ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                              <Loader2 className="animate-spin mx-auto mb-3 text-blue-500" size={28} />
                              Loading records from database...
                            </td>
                          </tr>
                        ) : uploadedData.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-12 text-center text-gray-500">
                              No records found.
                            </td>
                          </tr>
                        ) : (
                          uploadedData.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                              <td className="px-4 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap align-top">{item.student_id}</td>
                              <td className="px-4 py-4 font-medium text-gray-800 dark:text-gray-200 align-top leading-relaxed">{item.title}</td>
                              <td className="px-4 py-4 text-gray-500 dark:text-gray-400 align-top">
                                <div className="line-clamp-3 text-xs leading-relaxed">{item.description}</div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {!isCurrentTabLocked && !isCurrentTabUploaded && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl text-sm text-blue-800 dark:text-blue-300 flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Expected Excel Columns:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><strong className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">roll</strong> (Student ID)</li>
                      <li><strong className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">title</strong> (Project/Thesis Title)</li>
                      <li><strong className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">description</strong> or <strong className="font-mono bg-blue-100 dark:bg-blue-900/40 px-1 rounded">abstract</strong></li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <UploadCloud size={32} className="text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {file ? file.name : "Click to select Excel file"}
                    </span>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
                  </label>
                  
                  <button
                    onClick={handleImport}
                    disabled={!file || uploading}
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 h-[120px]"
                  >
                    {uploading ? (
                      <><Loader2 className="animate-spin" /> Processing...</>
                    ) : (
                      "Upload & Import"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
