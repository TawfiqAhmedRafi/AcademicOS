import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) return NextResponse.json({ message: "Email and OTP required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email });

    if (!user || !user.resetOtp) return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });

    if (new Date() > new Date(user.otpExpiry)) {
      return NextResponse.json({ message: "OTP has expired" }, { status: 400 });
    }

    // Stop brute-forcing the 6-digit code
    if (user.otpAttempts >= 5) {
      await db.collection("users").updateOne({ email }, { $unset: { resetOtp: "", otpExpiry: "", otpAttempts: "" } });
      return NextResponse.json({ message: "Too many failed attempts. Request a new OTP." }, { status: 429 });
    }

    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
    
    if (!isOtpValid) {
      await db.collection("users").updateOne({ email }, { $inc: { otpAttempts: 1 } });
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    return NextResponse.json({ message: "OTP verified successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}