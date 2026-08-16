import { User, Users, GraduationCap, FileCheck, Shield, LayoutDashboard } from "lucide-react";

export default function RoleBasedAccess() {
  const roles = [
    { title: "Student", desc: "View attendance, submit assignments, browse routines, and download result sheets.", icon: <User size={24} /> },
    { title: "Faculty", desc: "Mark attendance, grade assignments, enter marks, and review similarity flags.", icon: <GraduationCap size={24} /> },
    { title: "Advisor", desc: "Monitor advisee risk lists, track follow-up actions, and manage intervention notes.", icon: <Users size={24} /> },
    { title: "Coordinator", desc: "Clear the similarity verdict queue and manage specific course setups.", icon: <FileCheck size={24} /> },
    { title: "Dept Head", desc: "View department-wide analytics, enrollment trends, and similarity trend lines.", icon: <LayoutDashboard size={24} /> },
    { title: "Admin", desc: "Provision accounts, configure seat limits, and manage system audit logs.", icon: <Shield size={24} /> },
  ];

  return (
    <section className="w-full border-t border-slate-200/50 py-24 dark:border-white/5 dark:bg-[#020617] sm:py-32">
       <div className="w-full px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="mb-16 md:flex md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">Six Lenses, One Platform</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
              Role-Based Access Control (RBAC) ensures every user gets exactly the tools they need.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role, idx) => (
            <div key={idx} className="glass-panel flex flex-col items-start rounded-2xl p-8 transition-transform hover:-translate-y-1">
              <div className="mb-5 inline-flex rounded-xl bg-slate-100 p-3 text-ruet-blue dark:bg-white/10 dark:text-ruet-gold">
                {role.icon}
              </div>
              <h4 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{role.title}</h4>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{role.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}