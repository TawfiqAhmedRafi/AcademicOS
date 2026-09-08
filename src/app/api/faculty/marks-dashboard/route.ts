import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Helper to calculate the previous semester safely (e.g., "2-2" -> "2-1")
const getPreviousSemester = (sem: string) => {
  if (!sem) return null;
  const [year, term] = sem.split('-').map(Number);
  if (term === 2) return `${year}-1`;
  if (term === 1 && year > 1) return `${year - 1}-2`;
  return null;
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["faculty", "dept_head", "advisor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email: session.user.email });
    const initials = user?.initials;

    const activeSeries = await db.collection("series").find({ status: "active" }).toArray();
    
    // --- SMART FETCHING: Grab current AND previous semester slots ---
    const orConditions = activeSeries.flatMap(s => {
      const prevSem = getPreviousSemester(s.currentSemester);
      const conditions = [{ series: Number(s.series), semester: s.currentSemester }];
      if (prevSem) conditions.push({ series: Number(s.series), semester: prevSem });
      return conditions;
    });

    let courses: any[] = [];
    if (orConditions.length > 0 && initials) {
      const slots = await db.collection("routine_slots").find({
        $or: orConditions,
        teachers: initials
      }).toArray();

      const courseMap = new Map();
      slots.forEach(slot => {
        const key = `${slot.series}-${slot.courseCode}`;
        if (!courseMap.has(key)) {
          courseMap.set(key, {
            uniqueId: slot._id.toString(),
            courseCode: slot.courseCode,
            title: slot.courseName || slot.courseCode,
            series: slot.series,
            type: slot.type || 'theory',
            isSpecial: ["project", "thesis", "seminar"].includes(slot.type),
            teacherCount: slot.teachers?.length || 1,
            completedSegments: slot.completedSegments || [],
            isXXPending: slot.courseCode.includes("XX")
          });
        }
      });
      courses = Array.from(courseMap.values());
    }

    return NextResponse.json({ courses });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["faculty", "dept_head", "advisor"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { action, uniqueId, resolvedCode } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    // --- ISSUE 2 FIX: Validated XX Resolution ---
    if (action === "resolve_xx" && resolvedCode) {
      // Cross-reference against the official catalog to prevent typos!
      const validCourse = await db.collection("courses").findOne({ courseCode: resolvedCode });
      if (!validCourse) return NextResponse.json({ error: "Invalid course code. Not found in catalog." }, { status: 400 });

      await db.collection("routine_slots").updateOne(
        { _id: new ObjectId(uniqueId) },
        { $set: { courseCode: validCourse.courseCode, courseName: validCourse.title, isXXPending: false } }
      );
      return NextResponse.json({ message: "Course code validated and locked." });
    }

    if (action === "hide") {
      return NextResponse.json({ message: "Course hidden." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}