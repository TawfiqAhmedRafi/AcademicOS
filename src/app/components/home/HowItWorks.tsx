import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function HowItWorks() {
  return (
    <section id="workflow" className="relative w-full overflow-hidden bg-slate-50 py-24 dark:bg-black/20 sm:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Intelligent Workflows
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-xl text-slate-600 dark:text-slate-400">
            How the Academic OS connects daily operations with advanced machine learning.
          </p>
        </div>

        <div className="flex flex-col gap-24 lg:gap-32">
          
          {/* Step 1: Core Operations */}
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <div className="w-full lg:w-1/2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-ruet-blue/10 px-4 py-2 text-sm font-bold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                <span>01</span> <span className="h-1 w-1 rounded-full bg-current"></span> <span>Core Platform</span>
              </div>
              <h3 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Unified Operations</h3>
              <p className="mb-8 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Data flows seamlessly from registration to final transcripts. Faculty enter marks in spreadsheet-like grids, while the backend engine automatically computes GPAs and generates downloadable Result Sheets.
              </p>
              <ul className="space-y-4 text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle2 className="text-ruet-green" size={20}/> Real-time prerequisite & seat limit checks.</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-ruet-green" size={20}/> Conflict-free routine generation.</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-ruet-green" size={20}/> Automated transcript rendering.</li>
              </ul>
            </div>
            <div className="glass-panel relative w-full overflow-hidden rounded-3xl p-6 lg:w-1/2 xl:p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-ruet-blue/5 to-transparent dark:from-white/5"></div>
              {/* Mockup UI representation */}
              <div className="relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/80">
                <div className="h-6 w-32 rounded-md bg-slate-200 dark:bg-slate-700"></div>
                <div className="h-24 w-full rounded-md bg-slate-100 dark:bg-slate-800"></div>
                <div className="flex gap-2"><div className="h-8 w-1/3 rounded-md bg-ruet-blue/20 dark:bg-ruet-gold/20"></div></div>
              </div>
            </div>
          </div>

          {/* Step 2: Similarity Engine (Reversed layout) */}
          <div className="flex flex-col-reverse items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <div className="glass-panel relative w-full overflow-hidden rounded-3xl p-6 lg:w-1/2 xl:p-10">
               <div className="absolute inset-0 bg-gradient-to-tr from-ruet-gold/5 to-transparent dark:from-ruet-gold/10"></div>
               {/* Mockup UI representation */}
               <div className="relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/80">
                 <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
                   <div className="h-5 w-24 rounded-md bg-red-500/20"></div>
                   <div className="h-5 w-16 rounded-md bg-slate-200 dark:bg-slate-700"></div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="h-32 rounded-md bg-slate-100 dark:bg-slate-800"></div>
                   <div className="h-32 rounded-md bg-slate-100 border border-red-500/30 dark:bg-slate-800"></div>
                 </div>
               </div>
            </div>
            <div className="w-full lg:w-1/2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-ruet-blue/10 px-4 py-2 text-sm font-bold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                <span>02</span> <span className="h-1 w-1 rounded-full bg-current"></span> <span>Similarity Detection</span>
              </div>
              <h3 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Cross-Batch Plagiarism Scans</h3>
              <p className="mb-8 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                A course-scoped NLP engine runs every thesis and project submission through TF-IDF and dense embedding vector comparisons, strictly partitioned by course code to eliminate false positives.
              </p>
              <ul className="space-y-4 text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-3"><CheckCircle2 className="text-ruet-gold" size={20}/> Scans historical and peer submissions.</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-ruet-gold" size={20}/> Side-by-side excerpt highlighting.</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="text-ruet-gold" size={20}/> Human-in-the-loop verdict workflows.</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Risk Prediction */}
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <div className="w-full lg:w-1/2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-ruet-blue/10 px-4 py-2 text-sm font-bold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                <span>03</span> <span className="h-1 w-1 rounded-full bg-current"></span> <span>Machine Learning</span>
              </div>
              <h3 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Academic Risk Prediction</h3>
              <p className="mb-8 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                A FastAPI-powered Logistic Regression model continuously analyzes attendance patterns, submission rates, and GPA trends. When a student shows signs of falling behind, advisors are instantly alerted to intervene.
              </p>
              <a href="#" className="inline-flex items-center gap-2 font-bold text-ruet-blue hover:underline dark:text-ruet-gold">
                Explore the ML architecture <ArrowRight size={18} />
              </a>
            </div>
            <div className="glass-panel relative w-full overflow-hidden rounded-3xl p-6 lg:w-1/2 xl:p-10">
              <div className="absolute inset-0 bg-gradient-to-bl from-ruet-blue/5 to-transparent dark:from-white/5"></div>
              {/* Mockup UI representation */}
               <div className="relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/80">
                <div className="h-8 w-40 rounded-md bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex items-end gap-2 h-24 mt-2">
                  <div className="w-1/5 h-[40%] rounded-t-md bg-ruet-blue/40 dark:bg-ruet-blue"></div>
                  <div className="w-1/5 h-[60%] rounded-t-md bg-ruet-blue/60 dark:bg-ruet-blue"></div>
                  <div className="w-1/5 h-[30%] rounded-t-md bg-red-400 dark:bg-ruet-gold"></div>
                  <div className="w-1/5 h-[80%] rounded-t-md bg-ruet-blue/80 dark:bg-ruet-blue"></div>
                  <div className="w-1/5 h-[100%] rounded-t-md bg-ruet-blue dark:bg-ruet-blue"></div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}