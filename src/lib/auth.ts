import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: { strategy: "jwt" },
    pages: { signIn: "/login" },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const client = await clientPromise;
                const db = client.db("academicos");
                const user = await db.collection("users").findOne({ email: credentials.email });

                if (!user) throw new Error("Invalid email or password");

                if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
                    throw new Error("Account locked due to too many failed attempts.");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);

                if (!isPasswordValid) {
                    const updatedUser = await db.collection("users").findOneAndUpdate(
                        { _id: user._id },
                        { $inc: { loginAttempts: 1 } },
                        { returnDocument: 'after' } 
                    );
                    const attempts = updatedUser?.loginAttempts || updatedUser?.value?.loginAttempts || 1;
                    if (attempts >= 5) {
                        await db.collection("users").updateOne(
                            { _id: user._id },
                            { $set: { lockoutUntil: new Date(Date.now() + 15 * 60 * 1000) } }
                        );
                        throw new Error("Account locked due to 5 failed attempts. Try again in 15 minutes.");
                    } else {
                        throw new Error("Invalid email or password");
                    }
                }

                if (user.needs_setup) {
                    throw new Error(JSON.stringify({ 
                        code: "NEEDS_SETUP", 
                        role: user.role, 
                        initials: user.initials || "" 
                    }));
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    advising_series: user.advising_series, // <-- Updated
                    department: user.department,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            if (user || trigger === "update") {
                const client = await clientPromise;
                const db = client.db("academicos");
                const dbUser = await db.collection("users").findOne({ email: token.email });

                if (dbUser) {
                    token.id = dbUser._id.toString();
                    token.role = dbUser.role;
                    token.advising_series = dbUser.advising_series; // <-- Updated
                    token.department = dbUser.department;
                    token.picture = dbUser.profile_photo_url;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.advising_series = token.advising_series as string; // <-- Updated
                session.user.department = token.department as string;
                session.user.image = token.picture as string;
            }
            return session;
        },
    },
};