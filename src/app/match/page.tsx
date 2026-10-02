import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MatchClient from "./MatchClient";
import Navbar from "@/app/components/Navbar";

export const metadata = {
  title: "AOS Match | Similarity Search",
};

export default async function MatchPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <MatchClient user={session.user} />
      </div>
    </div>
  );
}
