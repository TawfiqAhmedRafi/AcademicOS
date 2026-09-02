import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_key";

export async function POST(req: Request) {
  try {
    const { newPassword } = await req.json();
    
    // 1. Read the secure cookie (Awaited for Next.js 15+)
    const cookieStore = await cookies();
    const resetToken = cookieStore.get("reset_token")?.value;

    if (!resetToken) {
      return NextResponse.json({ message: "Session expired or invalid. Please request a new OTP." }, { status: 401 });
    }

    // 2. Decode the token to safely get the email
    let email: string;
    try {
      const decoded = jwt.verify(resetToken, JWT_SECRET) as { email: string };
      email = decoded.email;
    } catch (err) {
      return NextResponse.json({ message: "Session expired. Please request a new OTP." }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");
    
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 3. Update password and clear ALL locks/OTP fields
    await db.collection("users").updateOne(
      { email },
      { 
        $set: { password_hash: hashedPassword, updatedAt: new Date() },
        $unset: { resetOtp: "", otpExpiry: "", otpAttempts: "", lockoutUntil: "", loginAttempts: "" }
      }
    );

    const response = NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
    
    // 4. Delete the reset_token cookie so it can't be reused
    response.cookies.delete("reset_token");

    return response;
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}