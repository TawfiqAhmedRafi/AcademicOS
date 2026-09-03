import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

import StudentView from "@/app/components/dashboard/views/StudentView";
// Import the other views once you create them:
// import FacultyView from "@/app/components/dashboard/views/FacultyView";
// import DeptHeadView from "@/app/components/dashboard/views/DeptHeadView";
// import AdminView from "@/app/components/dashboard/views/AdminView";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const { role } = session.user;

  // Render the heavily stacked modular views based on role
  switch (role) {
    case "student":
      return <StudentView user={session.user} />;
    case "faculty":
      // return <FacultyView user={session.user} />;
      return <div>Faculty View Placeholder</div>;
    case "dept_head":
      // return <DeptHeadView user={session.user} />;
      return <div>Dept Head View Placeholder</div>;
    case "admin":
      // return <AdminView user={session.user} />;
      return <div>Admin View Placeholder</div>;
    default:
      return <div>Dashboard Placeholder</div>;
  }
}