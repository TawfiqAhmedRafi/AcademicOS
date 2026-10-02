"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, BookOpen, X, Clock, CheckCircle2, Filter, Layers, FolderDot, Plus, Edit, Trash2, Loader2, Save } from "lucide-react";
import DropdownFilter from "../components/DropdownFilter";
import { useToast } from "../components/ToastProvider";
import Swal from "sweetalert2";

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

export default function CourseCatalog({ initialCourses, isHead }: { initialCourses: Course[], isHead: boolean }) {
  const [coursesList, setCoursesList] = useState<Course[]>(initialCourses);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Head Editing States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    document.body.style.overflow = (selectedCourse || isFormOpen) ? "hidden" : "unset";
  }, [selectedCourse, isFormOpen]);

  const filteredCourses = useMemo(() => {
    return coursesList.filter((course) => {
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
  }, [coursesList, search, semesterFilter, typeFilter, categoryFilter]);

  const uniqueSemesters = Array.from(new Set(coursesList.map(c => c.semester))).sort();
  const semesterOptions = [
    { label: "All Semesters", value: "All" },
    ...uniqueSemesters.map(sem => ({ label: `Semester ${sem}`, value: sem }))
  ];
  const typeOptions = [
    { label: "All Types", value: "All" },
    { label: "Theory Courses", value: "Theory" },
    { label: "Sessionals & Labs", value: "Sessional" },
    { label: "Projects & Thesis", value: "Project" },
  ];
  const categoryOptions = [
    { label: "All Categories", value: "All" },
    { label: "Mandatory", value: "Core" },
    { label: "Electives", value: "Elective" },
  ];

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Course?",
      text: "This removes the course from the catalog permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      reverseButtons: true
    });
    if (!result.isConfirmed) return;

    const res = await fetch(`/api/head/courses?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("Course deleted successfully", "success");
      setCoursesList(prev => prev.filter(c => c._id !== id));
      setSelectedCourse(null);
    } else {
      showToast("Failed to delete course", "error");
    }
  };

  const handleSaveForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    
    const isProject = formData.get("type") === "project";
    const isSessional = formData.get("type") === "sessional" || isProject;

    const payload = {
      courseCode: formData.get("courseCode"),
      title: formData.get("title"),
      semester: formData.get("semester"),
      credits: Number(formData.get("credits")),
      creditHours: Number(formData.get("creditHours")),
      isElective: formData.get("category") === "elective",
      isSessional,
      isProject,
      pairedCourseCode: formData.get("pairedCourseCode") || null,
      syllabus: formData.get("syllabus"),
    };

    const method = editingCourse ? "PUT" : "POST";
    const body = editingCourse ? { ...payload, _id: editingCourse._id } : payload;

    const res = await fetch("/api/head/courses", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`Course ${editingCourse ? "updated" : "added"} successfully`, "success");
      
      if (editingCourse) {
        setCoursesList(prev => prev.map(c => c._id === editingCourse._id ? { ...c, ...payload } as Course : c));
        if (selectedCourse) setSelectedCourse({ ...selectedCourse, ...payload } as Course);
      } else {
        setCoursesList([...coursesList, { ...payload, _id: data.id } as Course]);
      }
      setIsFormOpen(false);
      setEditingCourse(null);
    } else {
      showToast("Failed to save course", "error");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-12 relative">
      <div className="glass-panel relative flex flex-col z-40 gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between shadow-lg shadow-slate-200/50 dark:shadow-black/50">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search code or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white/50 py-2.5 pl-10 pr-4 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/10 dark:bg-black/20 dark:text-white dark:focus:border-ruet-gold"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
            <DropdownFilter icon={<Filter size={16}/>} options={semesterOptions} value={semesterFilter} onChange={setSemesterFilter} />
            <DropdownFilter icon={<Layers size={16}/>} options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
            <DropdownFilter icon={<FolderDot size={16}/>} options={categoryOptions} value={categoryFilter} onChange={setCategoryFilter} />
          </div>
          {isHead && (
            <button onClick={() => { setEditingCourse(null); setIsFormOpen(true); }} className="w-full sm:w-auto flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-ruet-blue px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400">
              <Plus size={16} /> Add Course
            </button>
          )}
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400 animate-in fade-in">
          <BookOpen className="mx-auto mb-4 h-12 w-12 opacity-20" />
          <p>No courses found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredCourses.map((course) => (
            <div 
              key={course._id} 
              onClick={() => setSelectedCourse(course)}
              className="glass-panel group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ruet-blue/30 hover:shadow-2xl hover:shadow-ruet-blue/10 dark:hover:border-ruet-gold/30 dark:hover:shadow-ruet-gold/5"
            >
              <div className="absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-ruet-blue/0 blur-2xl transition-colors duration-500 group-hover:bg-ruet-blue/10 dark:group-hover:bg-ruet-gold/10"></div>
              <div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="text-xl font-black tracking-tight text-ruet-blue dark:text-ruet-gold">{course.courseCode}</h3>
                  <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    <Clock size={12} /> {course.credits} Cr
                  </div>
                </div>
                <h4 className="mb-2 text-lg font-bold leading-tight text-slate-900 line-clamp-2 dark:text-white">{course.title}</h4>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${course.isElective ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"}`}>
                  {course.isElective ? "Elective" : "Core"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-400">
                  {course.isProject ? "Project" : course.isSessional ? "Lab" : "Theory"}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-400">
                  Semester {course.semester}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SYLLABUS MODAL */}
      {selectedCourse && !isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity dark:bg-black/60" onClick={() => setSelectedCourse(null)}></div>
          <div className="glass-panel relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-[#0f172a]">
            
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50/50 p-6 dark:border-white/10 dark:bg-black/20 sm:p-8">
              <div>
                <p className="mb-1 font-mono text-sm font-bold tracking-widest text-ruet-blue dark:text-ruet-gold">
                  {selectedCourse.courseCode}   SEMESTER {selectedCourse.semester}
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">{selectedCourse.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {isHead && (
                  <>
                    <button onClick={() => { setEditingCourse(selectedCourse); setIsFormOpen(true); }} className="rounded-full bg-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-300 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/20">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(selectedCourse._id)} className="rounded-full bg-red-100 p-2 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30">
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedCourse(null)} className="rounded-full bg-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-300 dark:bg-white/10 dark:text-slate-400 dark:hover:bg-white/20 dark:hover:text-white">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <div className="mb-8 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/5 dark:bg-white/5 sm:grid-cols-4">
                <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Credits</p><p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCourse.credits}</p></div>
                <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Credit Hours</p><p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCourse.creditHours}</p></div>
                <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Category</p><p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCourse.isElective ? "Elective" : "Mandatory"}</p></div>
                <div><p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Type</p><p className="text-lg font-bold text-slate-900 dark:text-white">{selectedCourse.isProject ? "Project" : selectedCourse.isSessional ? "Lab" : "Theory"}</p></div>
              </div>
              {selectedCourse.pairedCourseCode && (
                <div className="mb-8 flex items-center gap-3 rounded-xl border border-ruet-blue/20 bg-ruet-blue/5 p-4 dark:border-ruet-gold/20 dark:bg-ruet-gold/5">
                  <CheckCircle2 className="text-ruet-blue dark:text-ruet-gold" size={24} />
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Co-requisite Required</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">This course is structurally paired with <span className="font-bold">{selectedCourse.pairedCourseCode}</span>.</p>
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <BookOpen className="text-ruet-blue dark:text-ruet-gold" size={20} /> Course Syllabus
                </h3>
                <div className="prose prose-slate max-w-none text-sm leading-loose text-slate-600 dark:prose-invert dark:text-slate-300 whitespace-pre-wrap">
                  {selectedCourse.syllabus ? <p>{selectedCourse.syllabus}</p> : <p className="italic opacity-70">No specific syllabus data available for this module.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEAD ADMIN: ADD/EDIT COURSE MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-black/60 animate-in fade-in duration-200">
          <div className="glass-panel relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-slate-200 p-6 dark:border-white/10">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingCourse ? "Edit Course" : "Add New Course"}
              </h2>
              <button onClick={() => { setIsFormOpen(false); setEditingCourse(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Course Code</label>
                  <input required name="courseCode" defaultValue={editingCourse?.courseCode} type="text" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="ETE 1101" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Semester</label>
                  <input required name="semester" defaultValue={editingCourse?.semester} type="text" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="1-1" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Course Title</label>
                <input required name="title" defaultValue={editingCourse?.title} type="text" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="Basic Electrical Engineering" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Credits</label>
                  <input required name="credits" defaultValue={editingCourse?.credits} type="number" step="0.25" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="3.0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contact Hrs</label>
                  <input required name="creditHours" defaultValue={editingCourse?.creditHours} type="number" step="0.25" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="3.0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
                  <select name="category" defaultValue={editingCourse?.isElective ? "elective" : "core"} className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white">
                    <option value="core">Mandatory</option>
                    <option value="elective">Elective</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                  <select name="type" defaultValue={editingCourse?.isProject ? "project" : editingCourse?.isSessional ? "sessional" : "theory"} className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white">
                    <option value="theory">Theory</option>
                    <option value="sessional">Lab/Sessional</option>
                    <option value="project">Project/Thesis</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Paired Course (Optional)</label>
                <input name="pairedCourseCode" defaultValue={editingCourse?.pairedCourseCode || ""} type="text" className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-2.5 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white" placeholder="e.g., ETE 1102" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Syllabus / Overview</label>
                <textarea name="syllabus" defaultValue={editingCourse?.syllabus} rows={6} className="w-full rounded-xl border border-slate-300 bg-white/50 px-4 py-3 text-sm focus:border-ruet-blue outline-none dark:border-white/10 dark:bg-black/20 dark:text-white custom-scrollbar" placeholder="Enter detailed course syllabus..."></textarea>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => { setIsFormOpen(false); setEditingCourse(null); }} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 transition-colors">
                  Cancel
                </button>
                <button disabled={isSubmitting} type="submit" className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-ruet-blue hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 transition-colors">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}