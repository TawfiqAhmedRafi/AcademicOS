import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { sendOTP } from "@/lib/mail";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in user document with a 10-minute expiry
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { resetOtp: otp, resetOtpExpiry: new Date(Date.now() + 10 * 60 * 1000) } }
    );

    // Send it using existing Nodemailer transporter
    await sendOTP(session.user.email, otp);

    return NextResponse.json({ message: "OTP sent securely to your registered email." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send OTP." }, { status: 500 });
  }
}