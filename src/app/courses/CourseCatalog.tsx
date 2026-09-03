"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, BookOpen, X, Code, LayoutGrid, Clock, CheckCircle2 } from "lucide-react";

type Course = {
  _id: string;
  courseCode: string;
  title: string;
  semester: string;
  credits: number;
  creditHours: number;
  isSessional: boolean;
  isElective: boolean;
  isProject: boolean;
  pairedCourseCode: string | null;
  syllabus: string;
};

export default function CourseCatalog({ initialCourses }: { initialCourses: Course[] }) {
  // State for Filters
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // State for Modal
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (selectedCourse) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [selectedCourse]);

  // High-performance real-time filtering
  const filteredCourses = useMemo(() => {
    return initialCourses.filter((course) => {
      const matchesSearch = course.courseCode.toLowerCase().includes(search.toLowerCase()) || 
                            course.title.toLowerCase().includes(search.toLowerCase());
      const matchesSemester = semesterFilter === "All" || course.semester === semesterFilter;
      
      let matchesType = true;
      if (typeFilter === "Theory") matchesType = !course.isSessional;
      if (typeFilter === "Sessional") matchesType = course.isSessional && !course.isProject;
      if (typeFilter === "Project") matchesType = course.isProject;

      let matchesCategory = true;
      if (categoryFilter === "Core") matchesCategory = !course.isElective;
      if (categoryFilter === "Elective") matchesCategory = course.isElective;

      return matchesSearch && matchesSemester && matchesType && matchesCategory;
    });
  }, [initialCourses, search, semesterFilter, typeFilter, categoryFilter]);

  // Get unique semesters for the dropdown (e.g., 1-1, 1-2, 2-1...)
  const semesters = ["All", ...Array.from(new Set(initialCourses.map(c => c.semester))).sort()];

  return (
    <div className="space-y-8">
      
      {/* FILTER CONTROL BAR */}
      <div className="glass-panel sticky top-24 z-30 flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white/50 py-2.5 pl-10 pr-4 text-sm focus:border-ruet-blue focus:outline-none focus:ring-1 focus:ring-ruet-blue dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold dark:focus:ring-ruet-gold"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className="rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem === "All" ? "All Semesters" : `Semester ${sem}`}</option>
            ))}
          </select>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
            <option value="All">All Types</option>
            <option value="Theory">Theory</option>
            <option value="Sessional">Sessional/Lab</option>
            <option value="Project">Projects/Thesis</option>
          </select>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm text-slate-700 focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-slate-200">
            <option value="All">All Categories</option>
            <option value="Core">Core Mandatory</option>
            <option value="Elective">Electives</option>
          </select>
        </div>
      </div>

      {/* COURSE GRID */}
      {filteredCourses.length === 0 ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400">
          <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>No courses found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {filteredCourses.map((course) => (
            <div 
              key={course._id} 
              onClick={() => setSelectedCourse(course)}
              className="glass-panel group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-ruet-blue/10 dark:hover:shadow-ruet-gold/5"
            >
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="text-xl font-black tracking-tight text-ruet-blue dark:text-ruet-gold">
                    {course.courseCode}
                  </h3>
                  <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    <Clock size={12} /> {course.credits} Cr
                  </div>
                </div>
                <h4 className="mb-2 text-lg font-bold leading-tight text-slate-900 line-clamp-2 dark:text-white">
                  {course.title}
                </h4>
              </div>
              
              <div className="mt-6 flex items-center gap-2">
                <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${course.isElective ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"}`}>
                  {course.isElective ? "Elective" : "Core"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-400">
                  {course.isProject ? "Project" : course.isSessional ? "Lab" : "Theory"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-400">
                  Level {course.semester}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SYLLABUS MODAL */}
      {selectedCourse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Dimmed Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60"
            onClick={() => setSelectedCourse(null)}
          ></div>
          
          {/* Modal Content */}
          <div className="glass-panel relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a]">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/50 p-6 dark:border-white/10 dark:bg-black/20 sm:p-8">
              <div>
                <p className="mb-1 font-mono text-sm font-bold tracking-widest text-ruet-blue dark:text-ruet-gold">
                  {selectedCourse.courseCode} • SEMESTER {selectedCourse.semester}
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                  {selectedCourse.title}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedCourse(null)}
                className="rounded-full bg-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-300 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/20 dark:hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              
              {/* Stats Grid */}
              <div className="mb-8 grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-white/5 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Credits</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCourse.credits}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Contact Hrs</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCourse.creditHours}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedCourse.isElective ? "Elective" : "Core"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Type</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">
                    {selectedCourse.isProject ? "Project" : selectedCourse.isSessional ? "Lab" : "Theory"}
                  </p>
                </div>
              </div>

              {/* Paired Course Alert */}
              {selectedCourse.pairedCourseCode && (
                <div className="mb-8 flex items-center gap-3 rounded-xl border border-ruet-blue/20 bg-ruet-blue/5 p-4 dark:border-ruet-gold/20 dark:bg-ruet-gold/5">
                  <CheckCircle2 className="text-ruet-blue dark:text-ruet-gold" size={24} />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Co-requisite Required</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      This course is structurally paired with <span className="font-bold">{selectedCourse.pairedCourseCode}</span>.
                    </p>
                  </div>
                </div>
              )}

              {/* Syllabus Text */}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <BookOpen className="text-ruet-blue dark:text-ruet-gold" size={20} />
                  Course Syllabus
                </h3>
                <div className="prose prose-slate max-w-none text-sm leading-loose text-slate-600 dark:prose-invert dark:text-slate-300">
                  {selectedCourse.syllabus ? (
                    <p>{selectedCourse.syllabus}</p>
                  ) : (
                    <p className="italic opacity-70">No specific syllabus data available for this module.</p>
                  )}
                </div>
              </div>
              
            </div>
          </div>
        </div>
      )}

    </div>
  );
}