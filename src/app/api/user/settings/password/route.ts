import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { otp, newPassword } = await req.json();
    if (!otp || !newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "Invalid payload. Password must be at least 6 characters." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    const user = await db.collection("users").findOne({ email: session.user.email });

    if (!user || !user.resetOtp || user.resetOtp !== otp) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);

    await db.collection("users").updateOne(
      { email: session.user.email },
      { 
        $set: { password_hash, needs_setup: false }, // Clear the setup flag if this is their first time
        $unset: { resetOtp: "", resetOtpExpiry: "" }
      }
    );

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update password." }, { status: 500 });
  }
}