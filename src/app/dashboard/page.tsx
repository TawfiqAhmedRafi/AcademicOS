import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardSwitcher from "@/app/components/dashboard/DashboardSwitcher";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) redirect("/login");

  // Pass the user to the client-side switcher to handle multi-role tabs
  return <DashboardSwitcher user={session.user} />;
}