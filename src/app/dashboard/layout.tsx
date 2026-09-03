import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

// Use absolute imports to fix the resolution error
import Sidebar from "@/app/components/dashboard/Sidebar";
import Topbar from "@/app/components/dashboard/Topbar";

export const metadata = {
  title: "Dashboard | Academic OS",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#020617] overflow-hidden">
      <div className="absolute top-0 left-1/4 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-ruet-blue/10 blur-[150px] dark:bg-ruet-blue/20 pointer-events-none"></div>
      
      <div className="hidden lg:block lg:w-72 lg:shrink-0 h-full relative z-20">
        <Sidebar user={session.user} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden relative z-10">
        <div className="lg:hidden">
          <Topbar user={session.user} />
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}