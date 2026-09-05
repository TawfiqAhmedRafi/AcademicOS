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

    // 1. Get the logged-in student
    const user = await db.collection("users").findOne({ email: session?.user?.email });
    if (!user || !user.series) return NextResponse.json({ error: "Student series not found" }, { status: 404 });

    // 2. Get the global clock for their series
    const seriesConfig = await db.collection("series").findOne({ series: user.series });
    if (!seriesConfig) return NextResponse.json({ error: "Series configuration not found" }, { status: 404 });

    // 3. Fetch ONLY the classes for their specific series and active semester
    const slots = await db.collection("routine_slots").find({
      series: Number(user.series),
      semester: seriesConfig.currentSemester
    }).toArray();

    return NextResponse.json({ seriesConfig, slots });
  } catch (error) {
    console.error("Student Routine Fetch Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}