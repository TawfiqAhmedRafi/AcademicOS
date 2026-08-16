import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative flex min-h-[95vh] items-center justify-center overflow-hidden px-4 pt-24 sm:px-6 lg:px-12 2xl:px-24">
      {/* Cinematic Ambient Lighting */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[150px] dark:bg-ruet-blue/30"></div>
      <div className="absolute top-1/2 left-1/3 -z-10 h-[400px] w-[400px] rounded-full bg-ruet-gold/10 blur-[120px] dark:bg-ruet-gold/15"></div>

      <div className="z-10 w-full max-w-5xl text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-7xl xl:text-8xl">
          The Operating System for <br className="hidden lg:block" />
          <span className="bg-gradient-to-r from-ruet-blue via-blue-600 to-cyan-500 bg-clip-text text-transparent dark:from-ruet-gold dark:via-amber-300 dark:to-yellow-200">
            Modern Academics
          </span>
        </h1>
        
        <p className="mx-auto mt-8 max-w-3xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl lg:text-2xl leading-relaxed">
          Replace fragmented spreadsheets and paper records with a single, unified environment. From routine registration and ML based risk prediction to cross-batch similarity detection.
        </p>
        
        <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
          <Link href="/login" className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ruet-blue px-8 py-4 text-base font-bold text-white shadow-2xl transition-all hover:scale-105 hover:shadow-blue-900/20 dark:bg-ruet-gold dark:text-black dark:hover:shadow-amber-500/20 sm:w-auto">
            Access Portal
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/match" className="glass-panel w-full rounded-xl px-8 py-4 text-base font-bold text-slate-900 transition-all hover:bg-white/80 dark:text-white dark:hover:bg-white/10 sm:w-auto">
            Try Thesis Matcher
          </Link>
        </div>
      </div>
    </section>
  );
}