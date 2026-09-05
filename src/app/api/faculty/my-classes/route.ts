import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  
  // Ensure the user is a faculty member, advisor, or dept head
  if (!["faculty", "advisor", "dept_head"].includes(session?.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // 1. Get the logged-in user to find their unique initials
    const user = await db.collection("users").findOne({ email: session?.user?.email });
    if (!user || !user.initials) {
      return NextResponse.json({ slots: [], courses: [], error: "No initials assigned to this account." });
    }

    // 2. Fetch all currently active series (to ignore archived semesters)
    const activeSeries = await db.collection("series").find({ status: "active" }).toArray();
    if (activeSeries.length === 0) return NextResponse.json({ slots: [], courses: [] });

    const activeConditions = activeSeries.map(s => ({
      series: Number(s.series),
      semester: s.currentSemester
    }));

    // 3. Find slots where this teacher is assigned during the active semesters
    const slots = await db.collection("routine_slots").find({
      teachers: user.initials, // MongoDB automatically checks if the string exists in the array
      $or: activeConditions
    }).sort({ startPeriod: 1 }).toArray();

    // 4. Fetch the catalog data for the courses they teach
    const courseCodes = [...new Set(slots.map(s => s.courseCode))];
    const courses = await db.collection("courses").find({ courseCode: { $in: courseCodes } }).toArray();

    return NextResponse.json({ 
      slots, 
      courses, 
      initials: user.initials 
    });
  } catch (error) {
    console.error("My Classes Fetch Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}