import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = token?.role as string; // 'student', 'faculty', 'dept_head', 'admin', 'advisor'
    const isAdmin = token?.isAdmin as boolean;

    // Define protected path prefixes for each role tier
    const studentRoutes = ["/dashboard/registration", "/dashboard/form-fillup", "/dashboard/results", "/dashboard/backlog-registration", "/dashboard/calendar", "/dashboard/routine"];
    const facultyRoutes = ["/dashboard/classes", "/dashboard/marks", "/dashboard/similarity"];
    const advisorRoutes = ["/dashboard/roster", "/dashboard/approvals", "/dashboard/calendar-builder", "/dashboard/tabulation"];
    const headRoutes = ["/dashboard/series-manager", "/dashboard/student-mgmt", "/dashboard/head-results", "/dashboard/routine-builder"];
    const adminRoutes = ["/dashboard/faculty-mgmt", "/dashboard/user-mgmt", "/dashboard/logs"];

    // 0. Super-Admin Bypass
    // If the user is an admin or has the isAdmin flag, grant them unrestricted access
    if (role === "admin" || isAdmin) {
      return;
    }

    // 1. Admin Protections
    if (adminRoutes.some(r => path.startsWith(r)) && role !== "admin" && !isAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 2. Dept Head Protections
    if (headRoutes.some(r => path.startsWith(r)) && role !== "dept_head") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 3. Advisor Protections (Assumes Dept Head can also view advisor routes)
    if (advisorRoutes.some(r => path.startsWith(r)) && !["advisor", "dept_head"].includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 4. Faculty Protections (Faculty, Advisor, and Dept Head share these)
    const isFacultyLevel = ["faculty", "advisor", "dept_head"].includes(role);
    if (facultyRoutes.some(r => path.startsWith(r)) && !isFacultyLevel) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 5. Student Protections
    if (studentRoutes.some(r => path.startsWith(r)) && role !== "student") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  },
  {
    callbacks: {
      // Middleware only runs if this returns true (user is logged in)
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
  ],
};