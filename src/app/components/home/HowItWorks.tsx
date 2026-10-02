"use client";

import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function FadeInUp({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
      } ${className}`}
    >
      {children}
    </div>
  );
}

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
            <FadeInUp delay={0} className="w-full lg:w-1/2">
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
            </FadeInUp>
            <FadeInUp delay={200} className="glass-panel relative w-full overflow-hidden rounded-3xl p-6 lg:w-1/2 xl:p-10">
              <div className="absolute inset-0 bg-gradient-to-br from-ruet-blue/5 to-transparent dark:from-white/5"></div>
              {/* Mockup UI representation */}
              <div className="relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/90">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                   <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">Result Sheet Gen</div>
                   <div className="text-[10px] font-bold text-ruet-blue bg-ruet-blue/10 px-2 py-0.5 rounded-full dark:text-ruet-gold dark:bg-ruet-gold/10">Processing...</div>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between text-xs items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">1604001 - Abdul</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">3.84</span>
                   </div>
                   <div className="flex justify-between text-xs items-center">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">1604002 - Ali </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">3.92</span>
                   </div>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                   <div className="h-full w-[75%] rounded-full bg-ruet-blue dark:bg-ruet-gold animate-pulse"></div>
                </div>
              </div>
            </FadeInUp>
          </div>

          {/* Step 2: Similarity Engine (Reversed layout) */}
          <div className="flex flex-col-reverse items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <FadeInUp delay={0} className="glass-panel relative w-full overflow-hidden rounded-3xl p-6 lg:w-1/2 xl:p-10">
               <div className="absolute inset-0 bg-gradient-to-tr from-ruet-gold/5 to-transparent dark:from-ruet-gold/10"></div>
               {/* Mockup UI representation */}
               <div className="relative flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/90">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                   <div className="flex items-center gap-2">
                     <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-black text-red-600 dark:bg-red-900/40 dark:text-red-400">89% Match</span>
                     <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Found in Series 18</span>
                   </div>
                   <div className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">Review</div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                     "...we propose a <mark className="bg-blue-200 px-1 rounded-sm text-blue-900 dark:bg-blue-900/60 dark:text-blue-100 font-medium">novel IoT-based smart farming</mark> system utilizing..."
                   </div>
                   <div className="rounded-lg border border-red-100 bg-red-50/50 p-3 text-[11px] leading-relaxed text-slate-600 dark:border-red-900/30 dark:bg-red-900/10 dark:text-slate-400">
                     "...implementing a <mark className="bg-red-200 px-1 rounded-sm text-red-900 dark:bg-red-900/60 dark:text-red-100 font-medium">novel IoT-based smart farming</mark> architecture..."
                   </div>
                 </div>
               </div>
            </FadeInUp>
            <FadeInUp delay={200} className="w-full lg:w-1/2">
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
            </FadeInUp>
          </div>

          {/* Step 3: Match Analytics */}
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:justify-between lg:gap-16">
            <FadeInUp delay={0} className="w-full lg:w-1/2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-ruet-blue/10 px-4 py-2 text-sm font-bold text-ruet-blue dark:bg-ruet-gold/10 dark:text-ruet-gold">
                <span>03</span> <span className="h-1 w-1 rounded-full bg-current"></span> <span>Data Insights</span>
              </div>
              <h3 className="mb-6 text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Match Telemetry & Analytics</h3>
              <p className="mb-8 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Gain pool-level insights into student research trends. The system tracks rising topics, identifies underexplored domains, and maps series domain distribution to help faculty make data-driven curriculum decisions.
              </p>
              <a href="#" className="inline-flex items-center gap-2 font-bold text-ruet-blue hover:underline dark:text-ruet-gold">
                Explore telemetry dashboard <ArrowRight size={18} />
              </a>
            </FadeInUp>
            <FadeInUp delay={200} className="glass-panel relative w-full overflow-hidden rounded-3xl p-6 lg:w-1/2 xl:p-10">
              <div className="absolute inset-0 bg-gradient-to-bl from-ruet-blue/5 to-transparent dark:from-white/5"></div>
              {/* Mockup UI representation */}
               <div className="relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#0f172a]/90">
                <div className="flex items-center justify-between mb-2">
                   <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Trending Domains</span>
                   <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">↑ 12% vs last year</span>
                </div>
                <div className="space-y-4 mt-2">
                   <div>
                     <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">Machine Learning</span>
                        <span className="font-mono text-slate-500 font-bold">42</span>
                     </div>
                     <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full w-[85%] rounded-full bg-blue-500 dark:bg-blue-400"></div>
                     </div>
                   </div>
                   <div>
                     <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">IoT & Embedded</span>
                        <span className="font-mono text-slate-500 font-bold">28</span>
                     </div>
                     <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full w-[55%] rounded-full bg-blue-400 dark:bg-blue-500/70"></div>
                     </div>
                   </div>
                   <div>
                     <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1.5">
                          Computer Vision 
                          <span className="text-[9px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-bold tracking-wider">HOT</span>
                        </span>
                        <span className="font-mono text-slate-500 font-bold">19</span>
                     </div>
                     <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full w-[40%] rounded-full bg-ruet-gold dark:bg-ruet-gold"></div>
                     </div>
                   </div>
                </div>
              </div>
            </FadeInUp>
          </div>

        </div>
      </div>
    </section>
  );
}