import { Fingerprint, Network, ShieldAlert, GraduationCap, Clock, BookOpen } from "lucide-react";

export default function Features() {
  const features = [
    {
      title: "Similarity Engine",
      desc: "Course-scoped TF-IDF and embedding similarity catching recycled thesis and project work across batches.",
      icon: <Fingerprint size={28} className="text-ruet-blue dark:text-ruet-gold" />
    },
    {
      title: "Risk Prediction ML",
      desc: "Logistic Regression model analyzing attendance, submission rates, and GPA trends to auto-flag at-risk students.",
      icon: <ShieldAlert size={28} className="text-ruet-blue dark:text-ruet-gold" />
    },
    {
      title: "Core Academics",
      desc: "End-to-end management of prerequisite checks, seat limits, and course registration workflows.",
      icon: <BookOpen size={28} className="text-ruet-blue dark:text-ruet-gold" />
    },
    {
      title: "GPA & Assessments",
      desc: "Per-course grade point computation and automated semester Result Sheet transcript generation.",
      icon: <GraduationCap size={28} className="text-ruet-blue dark:text-ruet-gold" />
    },
    {
      title: "Routine Scheduler",
      desc: "Conflict-detecting schedule logic ensuring zero overlaps for faculty members or room allocations.",
      icon: <Clock size={28} className="text-ruet-blue dark:text-ruet-gold" />
    },
    {
      title: "Advising & Notices",
      desc: "Role-targeted broadcast boards and private advisor-student intervention action tracking.",
      icon: <Network size={28} className="text-ruet-blue dark:text-ruet-gold" />
    }
  ];

  return (
    <section id="features" className="w-full py-24 sm:py-32">
      <div className="w-full px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="mb-20 text-center">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">Platform Architecture</h2>
          <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600 dark:text-slate-400">A completely integrated Node.js and FastAPI stack built to handle the complexities of university administration.</p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
          {features.map((feat, idx) => (
            <div key={idx} className="glass-panel group relative overflow-hidden rounded-3xl p-10 transition-all hover:-translate-y-2 hover:shadow-2xl dark:hover:shadow-ruet-gold/5">
              <div className="absolute -right-10 -top-10 z-0 h-40 w-40 rounded-full bg-slate-100/50 blur-3xl transition-all group-hover:bg-ruet-blue/10 dark:bg-white/5 dark:group-hover:bg-ruet-gold/10"></div>
              
              <div className="relative z-10 mb-8 inline-flex rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5 dark:bg-[#0f172a] dark:ring-white/10">
                {feat.icon}
              </div>
              <h3 className="relative z-10 mb-4 text-2xl font-bold text-slate-900 dark:text-white">{feat.title}</h3>
              <p className="relative z-10 text-base leading-relaxed text-slate-600 dark:text-slate-400">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}