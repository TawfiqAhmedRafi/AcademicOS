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
    if (!user || !user.series) return NextResponse.json({ error: "Student series not found" }, { status: 404 });

    const seriesConfig = await db.collection("series").findOne({ series: user.series });
    if (!seriesConfig) return NextResponse.json({ error: "Series not found" }, { status: 404 });

    const calendar = await db.collection("academic_calendars").findOne({ 
      series: Number(user.series), 
      semester: seriesConfig.currentSemester,
      status: "published" // Only show published calendars!
    });

    // --- FIX: Clean up old long strings ---
    if (calendar && calendar.ctSchedule) {
      calendar.ctSchedule = calendar.ctSchedule.map((ct: any) => {
        if (ct.courseCode && ct.courseCode.includes(" / ")) {
          const firstCode = ct.courseCode.split(" / ")[0].trim();
          ct.courseCode = firstCode.length > 2 ? firstCode.slice(0, -2) + "XX" : "Electives";
        }
        return ct;
      });
    }

    return NextResponse.json({ calendar, seriesConfig });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}