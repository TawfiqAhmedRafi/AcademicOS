import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { sendVerificationCode } from "@/lib/mail";
import {
  isUserVerified,
  VERIFICATION_CODE_TTL_MS,
  VERIFICATION_RESEND_COOLDOWN_MS,
} from "@/lib/verification";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/verify-email/send
 * Body: { email, password }
 * Sends a 6-digit email verification code to an unverified user.
 * The password is re-checked so only the account holder can trigger emails.
 */
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      return NextResponse.json({ message: "Account locked due to too many failed attempts." }, { status: 423 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (isUserVerified(user)) {
      return NextResponse.json({ message: "Email is already verified", alreadyVerified: true }, { status: 400 });
    }

    // Resend cooldown
    if (user.lastVerificationSentAt) {
      const elapsed = Date.now() - new Date(user.lastVerificationSentAt).getTime();
      if (elapsed < VERIFICATION_RESEND_COOLDOWN_MS) {
        const retryAfter = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - elapsed) / 1000);
        return NextResponse.json(
          { message: `Please wait ${retryAfter}s before requesting another code.`, retryAfter },
          { status: 429 }
        );
      }
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = await bcrypt.hash(code, 10);

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          verificationCode: hashedCode,
          verificationCodeExpiry: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
          verificationAttempts: 0,
          lastVerificationSentAt: new Date(),
        },
      }
    );

    await sendVerificationCode(email, code);

    return NextResponse.json(
      { message: "Verification code sent", retryAfter: Math.ceil(VERIFICATION_RESEND_COOLDOWN_MS / 1000) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Send verification code error:", error);
    return NextResponse.json({ message: "Failed to send verification code" }, { status: 500 });
  }
}

