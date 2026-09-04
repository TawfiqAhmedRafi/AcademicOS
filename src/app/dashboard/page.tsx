import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import StudentView from "@/app/components/dashboard/views/StudentView";
import FacultyView from "@/app/components/dashboard/views/FacultyView";
import DeptHeadView from "@/app/components/dashboard/views/DeptHeadView";
import AdminView from "@/app/components/dashboard/views/AdminView";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { role } = session.user;

  switch (role) {
    case "student":
      return <StudentView user={session.user} />;
    case "faculty":
      return <FacultyView user={session.user} />;
    case "dept_head":
      return <DeptHeadView user={session.user} />;
    case "admin":
      return <AdminView user={session.user} />;
    default:
      return <div>Unrecognized Role. Please contact IT.</div>;
  }
}