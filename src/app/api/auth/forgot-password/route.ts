import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendOTP } from "@/lib/mail";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "No account found with this email." }, { status: 404 });
    }

    // STRICT SPAM LOCKOUT: Lock forgot password for 15 mins after EACH request
    if (user.lastOtpSentAt) {
      const timeSinceLastOtp = Date.now() - new Date(user.lastOtpSentAt).getTime();
      const cooldownMs = 15 * 60 * 1000; // 15 minutes
      
      if (timeSinceLastOtp < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timeSinceLastOtp) / 60000);
        return NextResponse.json(
          { message: `For security, you must wait ${remainingMinutes} minutes before requesting another code.` }, 
          { status: 429 }
        );
      }
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // Code valid for 10 mins

    const hashedOtp = await bcrypt.hash(otp, 10);

    // Save state to DB
    await db.collection("users").updateOne(
      { email },
      { 
        $set: { 
          resetOtp: hashedOtp, 
          otpExpiry, 
          otpAttempts: 0,
          lastOtpSentAt: new Date() // Sets the 15-minute lock timer
        } 
      }
    );

    await sendOTP(email, otp);

    return NextResponse.json({ message: "OTP sent successfully" }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}