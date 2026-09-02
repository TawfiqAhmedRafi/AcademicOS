import { withAuth } from "next-auth/middleware";
import { NextRequest } from "next/server";

// 1. Define the NextAuth middleware configuration
const authMiddleware = withAuth({
  pages: {
    signIn: "/login",
  },
});

// 2. Explicitly export a standard function to satisfy the Next.js compiler
export default function middleware(req: NextRequest, event: any) {
  return (authMiddleware as any)(req, event);
}

// 3. Specify exactly which routes require authentication
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/routine/:path*",
    "/match/:path*",
    "/notice/:path*",
    "/modules/:path*"
  ],
};