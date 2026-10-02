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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Navbar />
      <main className="pt-24 pb-12">
        <MatchClient user={session.user} />
      </main>
    </div>
  );
}
