import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // We don't save failed transactions to the DB for Form Fill-up
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/form-fillup?payment=failed`,
      { status: 303 }
    );
  } catch (error: any) {
    console.error("Form-fillup payment fail callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/form-fillup?payment=failed`,
      { status: 303 }
    );
  }
}
