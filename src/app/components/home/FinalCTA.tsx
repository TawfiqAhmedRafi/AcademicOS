import Link from "next/link";
import { ArrowRight, Terminal } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="relative w-full overflow-hidden border-t border-slate-200/50 py-24 dark:border-white/5 sm:py-32">
      {/* Background Cinematic Lighting */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-ruet-blue/10 via-transparent to-transparent dark:from-ruet-gold/10"></div>

      <div className="w-full px-4 text-center sm:px-6 lg:px-12 2xl:px-24">
        <div className="glass-panel mx-auto max-w-5xl rounded-3xl p-10 sm:p-16 lg:p-20">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Ready to upgrade your academic operations?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600 dark:text-slate-400">
            From streamlined result generation to advanced cross-batch similarity detection. Build a smarter department today.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-ruet-blue px-8 py-4 text-base font-bold text-white shadow-xl transition-all hover:bg-blue-900 dark:bg-ruet-gold dark:text-black dark:hover:bg-amber-400 sm:w-auto"
            >
              Institutional Login
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="/match"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-transparent px-8 py-4 text-base font-bold text-slate-900 transition-colors hover:bg-slate-100 dark:border-white/20 dark:text-white dark:hover:bg-white/10 sm:w-auto"
            >
              Try Project & Thesis Matcher
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
