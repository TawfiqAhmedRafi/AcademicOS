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
                console.log("--- AUTH ATTEMPT ---");
                console.log("1. Email entered:", credentials?.email);

                if (!credentials?.email || !credentials?.password) return null;

                const client = await clientPromise;
                const db = client.db("academicos");
                const user = await db.collection("users").findOne({ email: credentials.email });

                if (!user) {
                    console.log("❌ ERROR: User not found in MongoDB.");
                    throw new Error("Invalid email or password");
                }

                console.log("2. User found in DB. needs_setup =", user.needs_setup);

                if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
                    console.log("❌ ERROR: Account is locked.");
                    throw new Error("Account locked due to too many failed attempts.");
                }

                const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
                console.log("3. Password match result:", isPasswordValid);
                if (!isPasswordValid) {
                    const attempts = (user.loginAttempts || 0) + 1;
                    const updates: any = { $set: { loginAttempts: attempts } };

                    // If they hit 5 attempts, lock the account for exactly 15 minutes
                    if (attempts >= 5) {
                        updates.$set.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
                    }
                    await db.collection("users").updateOne({ _id: user._id }, updates);

                    if (attempts >= 5) {
                        throw new Error("Account locked due to 5 failed attempts. Try again in 15 minutes.");
                    } else {
                        throw new Error("Invalid email or password");
                    }
                }

                if (user.needs_setup) {
                    console.log("⚠️ INTERCEPT: Throwing NEEDS_SETUP error to trigger frontend UI.");
                    throw new Error("NEEDS_SETUP");
                }

                console.log("✅ SUCCESS: Login approved.");
                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    series: user.series,
                    department: user.department,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger }) {
            // Update token with database values[cite: 6]
            if (user || trigger === "update") {
                const client = await clientPromise;
                const db = client.db("academicos");
                const dbUser = await db.collection("users").findOne({ email: token.email });

                if (dbUser) {
                    token.id = dbUser._id.toString();
                    token.role = dbUser.role;
                    token.series = dbUser.series;
                    token.department = dbUser.department;
                }
            }
            return token;
        },
        async session({ session, token }) {
            // Inject token values into the session object[cite: 6]
            if (token && session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.series = token.series as string;
                session.user.department = token.department as string;
            }
            return session;
        },
    },
};