import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { isUserVerified, VERIFICATION_MAX_ATTEMPTS } from "@/lib/verification";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/verify-email/confirm
 * Body: { email, password, code }
 * Confirms the 6-digit verification code and marks the user as verified.
 */
export async function POST(req: Request) {
  try {
    const { email, password, code } = await req.json();
    if (!email || !password || !code) {
      return NextResponse.json({ message: "Email, password and code are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (isUserVerified(user)) {
      return NextResponse.json({ message: "Email is already verified", alreadyVerified: true }, { status: 200 });
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return NextResponse.json({ message: "No active code. Please request a new one." }, { status: 400 });
    }

    if (new Date() > new Date(user.verificationCodeExpiry)) {
      return NextResponse.json({ message: "Code has expired. Please request a new one." }, { status: 400 });
    }

    if ((user.verificationAttempts || 0) >= VERIFICATION_MAX_ATTEMPTS) {
      await db.collection("users").updateOne(
        { _id: user._id },
        { $unset: { verificationCode: "", verificationCodeExpiry: "", verificationAttempts: "" } }
      );
      return NextResponse.json({ message: "Too many failed attempts. Request a new code." }, { status: 429 });
    }

    const isCodeValid = await bcrypt.compare(String(code).trim(), user.verificationCode);
    if (!isCodeValid) {
      await db.collection("users").updateOne({ _id: user._id }, { $inc: { verificationAttempts: 1 } });
      const remaining = VERIFICATION_MAX_ATTEMPTS - ((user.verificationAttempts || 0) + 1);
      return NextResponse.json(
        { message: `Invalid code. ${Math.max(remaining, 0)} attempt(s) remaining.` },
        { status: 400 }
      );
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { isVerified: true, verifiedAt: new Date() },
        $unset: {
          verificationCode: "",
          verificationCodeExpiry: "",
          verificationAttempts: "",
          lastVerificationSentAt: "",
        },
      }
    );

    return NextResponse.json({ message: "Email verified successfully" }, { status: 200 });
  } catch (error) {
    console.error("Confirm verification code error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

