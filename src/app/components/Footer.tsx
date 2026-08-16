import Link from "next/link";
import {  Mail, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white pt-16 pb-8 dark:border-white/10 dark:bg-[#020617]">
      <div className="w-full px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Academic <span className="text-ruet-gold">OS</span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Department of Electronics and Telecommunication Engineering, <br />
              Rajshahi University of Engineering & Technology.
            </p>
            <div className="flex gap-4">
              
              <a href="#" className="text-slate-400 hover:text-ruet-blue dark:hover:text-ruet-gold"><Globe size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-ruet-blue dark:hover:text-ruet-gold"><Mail size={20} /></a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="mb-6 font-semibold text-slate-900 dark:text-white">Platform Modules</h4>
            <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">Course Registration</Link></li>
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">Similarity Matcher</Link></li>
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">Risk Prediction</Link></li>
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">Grade Calculation</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h4 className="mb-6 font-semibold text-slate-900 dark:text-white">Support & Legal</h4>
            <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">IT Helpdesk</Link></li>
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">System Status</Link></li>
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">Data Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-ruet-blue dark:hover:text-ruet-gold">Admin Onboarding</Link></li>
            </ul>
          </div>

          {/* Newsletter / Status */}
          <div>
            <h4 className="mb-6 font-semibold text-slate-900 dark:text-white">System Updates</h4>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Get notified of routine updates, maintenance, and platform upgrades.
            </p>
            <div className="flex gap-2">
              <input 
                type="email" 
                placeholder="Institutional Email" 
                className="w-full rounded-lg border border-slate-300 bg-transparent px-4 py-2 text-sm focus:border-ruet-blue focus:outline-none dark:border-white/20 dark:focus:border-ruet-gold"
              />
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ruet-blue dark:bg-white dark:text-black dark:hover:bg-ruet-gold">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between border-t border-slate-200/50 pt-8 dark:border-white/10 sm:flex-row">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} Academic OS. All rights reserved.
          </p>
          <div className="mt-4 flex items-center gap-2 sm:mt-0">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}