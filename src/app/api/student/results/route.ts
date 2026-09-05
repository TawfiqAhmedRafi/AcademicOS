import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email: session.user.email });
    
    return NextResponse.json({ 
      cgpa: user?.cgpa || 0,
      academicHistory: user?.academicHistory || [],
      activeBacklogs: user?.activeBacklogs || []
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}