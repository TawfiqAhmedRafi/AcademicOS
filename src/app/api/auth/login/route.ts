import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_key";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // INTERCEPT: If the user needs to complete first-time setup
    if (user.needs_setup) {
      return NextResponse.json({ needsSetup: true }, { status: 200 });
    }

    // Standard Login: Generate JWT for fully setup users
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role, 
        series: user.series,
        department: user.department 
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({ success: true, redirectUrl: "/dashboard" });
    response.cookies.set({
      name: "aos_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}