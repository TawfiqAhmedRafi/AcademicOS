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
    const facultyRoutes = ["/dashboard/classes", "/dashboard/marks", "/dashboard/projects"];
    const advisorRoutes = ["/dashboard/roster", "/dashboard/approvals", "/dashboard/calendar-builder", "/dashboard/tabulation", "/dashboard/match-import"];
    const headRoutes = ["/dashboard/series-manager", "/dashboard/student-mgmt", "/dashboard/head-results", "/dashboard/routine-builder"];
    const adminRoutes = [
      "/dashboard/faculty-mgmt", 
      "/dashboard/user-mgmt", 
      "/dashboard/logs",
      "/dashboard/match-vocab",
      "/dashboard/match-analysis",
      "/dashboard/match-insights",
      "/dashboard/match-compare"
    ];

    // 0. Super-Admin Bypass
    // If the user is an admin or has the isAdmin flag, grant them unrestricted access
    if (role === "admin" || isAdmin) {
      return;
    }

    // 1. Admin Protections (Dept Head also has access to telemetry and vocab)
    const isAdminLevel = role === "admin" || isAdmin || role === "dept_head";
    if (adminRoutes.some(r => path.startsWith(r)) && !isAdminLevel) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 2. Dept Head Protections
    if (headRoutes.some(r => path.startsWith(r)) && role !== "dept_head") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 3. Advisor Protections (Users with advising_series, advisor role, or dept_head)
    const isAdvisor = !!token?.advising_series || ["advisor", "dept_head"].includes(role);
    if (advisorRoutes.some(r => path.startsWith(r)) && !isAdvisor) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 4. Faculty Protections (Faculty, Advisor, and Dept Head share these)
    const isFacultyLevel = ["faculty", "advisor", "dept_head"].includes(role) || isAdvisor;
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