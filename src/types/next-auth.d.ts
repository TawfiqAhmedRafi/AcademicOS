import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      advising_series?: string;
      department?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    advising_series?: string;
    department?: string;
    needs_setup?: boolean;
    initials?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    advising_series?: string;
    department?: string;
    picture?: string;
  }
}