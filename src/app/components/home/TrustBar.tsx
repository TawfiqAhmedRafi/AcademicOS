export default function TrustBar() {
  return (
    <section className="relative w-full border-y border-slate-200/50 bg-white/30 py-12 backdrop-blur-md dark:border-white/5 dark:bg-black/20">
      <div className="w-full px-4 sm:px-6 lg:px-12 2xl:px-24">
        <p className="mb-8 text-center text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Engineered exclusively for the Department of ETE
        </p>
        <div className="flex flex-wrap items-center justify-center gap-12 opacity-80 sm:gap-24">
          <div className="flex items-center gap-3 transition-opacity hover:opacity-100">
             {/* Using typography as geometric logos for a high-end feel */}
             <span className="font-serif text-3xl font-black text-slate-900 dark:text-white">RUET</span>
             <span className="text-sm font-medium leading-tight text-slate-500 dark:text-slate-400">Undergraduate<br/>Students</span>
          </div>
          <div className="h-8 w-px bg-slate-300 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3 transition-opacity hover:opacity-100">
             <span className="font-sans text-3xl font-black tracking-tighter text-slate-900 dark:text-white">FACULTY</span>
             <span className="text-sm font-medium leading-tight text-slate-500 dark:text-slate-400">Course &<br/>Advising Oversight</span>
          </div>
          <div className="hidden sm:block h-8 w-px bg-slate-300 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3 transition-opacity hover:opacity-100">
             <span className="font-mono text-3xl font-black text-slate-900 dark:text-white">ADMIN</span>
             <span className="text-sm font-medium leading-tight text-slate-500 dark:text-slate-400">Department<br/>Coordination</span>
          </div>
        </div>
      </div>
    </section>
  );
}