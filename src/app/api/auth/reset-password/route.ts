import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();
    
    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email });

    if (!user || !user.resetOtp) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    
    // Verify OTP again just to be safe
    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
    if (!isOtpValid) return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear ALL locks and OTP fields
    await db.collection("users").updateOne(
      { email },
      { 
        $set: { password_hash: hashedPassword, updatedAt: new Date() },
        $unset: { resetOtp: "", otpExpiry: "", otpAttempts: "", lastOtpSentAt: "", lockoutUntil: "", loginAttempts: "" }
      }
    );

    return NextResponse.json({ message: "Password reset successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}