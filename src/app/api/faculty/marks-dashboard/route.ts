import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const SPECIAL_COURSES = ["ETE 2200", "ETE 3200", "ETE 3218", "ETE 4100", "ETE 4200"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!["faculty", "advisor", "dept_head"].includes(session?.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    const user = await db.collection("users").findOne({ email: session?.user?.email });
    if (!user || !user.initials) return NextResponse.json({ courses: [] });

    const activeSeries = await db.collection("series").find({ status: "active" }).toArray();
    if (activeSeries.length === 0) return NextResponse.json({ courses: [] });

    const activeConditions = activeSeries.map(s => ({ series: Number(s.series), semester: s.currentSemester }));
    const rawSlots = await db.collection("routine_slots").find({
      teachers: user.initials,
      $or: activeConditions
    }).toArray();

    let assignedCourses: any[] = [];
    const resolvedXX = user.resolvedXX || {}; // Fetch the teacher's saved XX codes

    rawSlots.forEach((slot: any) => {
      let finalCourseCode = slot.courseCode;
      let baseType = slot.type.includes('lab') || slot.type.includes('sessional') ? 'sessional' : 'theory';
      let teacherCount = slot.teachers?.length || 1;

      // FLAW 2 FIX: Hard Split Logic by Index mapped to generic string splitting
      if (slot.courseCode.includes('/')) {
        const splitCodes = slot.courseCode.split('/').map((c: string) => c.trim());
        const teacherIndex = slot.teachers?.findIndex((t: string) => t === user.initials) || 0;
        
        if (splitCodes[teacherIndex]) {
          finalCourseCode = splitCodes[teacherIndex];
          teacherCount = 1; 
        }
      } 
      // Fallback to advanced modal builder split
      else if (slot.isSplit && slot.splitTeachers) {
        const splitIndex = slot.splitTeachers.findIndex((tGroup: string[]) => tGroup.includes(user.initials));
        if (splitIndex !== -1) {
          const splitCodes = slot.courseCode.split('/').map((c: string) => c.trim());
          finalCourseCode = splitCodes[splitIndex] || slot.courseCode;
          teacherCount = slot.splitTeachers[splitIndex].length;
        }
      }

      // --- NEW FIX 1: XX Electives are distinct 1-teacher courses ---
      if (finalCourseCode.includes('XX')) {
          teacherCount = 1;
      }

      // --- NEW FIX 2: Inject baseType to prevent Sessional/Theory collisions ---
      const uniqueId = `${finalCourseCode}_${baseType}_${slot.series}`;

      // --- NEW FIX 3: Apply the saved MongoDB exact course code ---
      const displayCode = resolvedXX[uniqueId] || finalCourseCode;
      const isXXPending = finalCourseCode.includes('XX') && !resolvedXX[uniqueId];

      if (!assignedCourses.find(c => c.uniqueId === uniqueId)) {
        assignedCourses.push({
          uniqueId,
          courseCode: displayCode, // Passes the exact ETE 3211 back to the UI!
          originalCode: finalCourseCode,
          series: slot.series,
          type: baseType,
          isSpecial: false,
          teacherCount,
          isXXPending
        });
      }
    });

    // Special Courses (Broadcast)
    const activeSemesters = [...new Set(activeSeries.map(s => s.currentSemester))];
    const catalogSpecial = await db.collection("courses").find({
      semester: { $in: activeSemesters },
      courseCode: { $in: SPECIAL_COURSES }
    }).toArray();

    catalogSpecial.forEach(specialCourse => {
      const matchingSeries = activeSeries.filter(s => s.currentSemester === specialCourse.semester);
      matchingSeries.forEach(series => {
        const uniqueId = `${specialCourse.courseCode}_special_${series.series}`;
        if (!assignedCourses.find(c => c.uniqueId === uniqueId)) {
          assignedCourses.push({
            uniqueId,
            courseCode: specialCourse.courseCode,
            series: Number(series.series),
            type: 'special',
            isSpecial: true,
            teacherCount: 1,
            isXXPending: false
          });
        }
      });
    });

    const hiddenCourses = user.hiddenMarksCourses || [];
    const visibleCourses = assignedCourses.filter(c => !hiddenCourses.includes(c.uniqueId));

    const existingMarks = await db.collection("course_marks").find({
      teacherEmail: session.user.email
    }).project({ courseCode: 1, series: 1, segment: 1 }).toArray();

    const allCourseCodes = [...new Set(visibleCourses.map(c => c.courseCode))];
    const catalogData = await db.collection("courses").find({ 
      courseCode: { $in: allCourseCodes } 
    }).toArray();

    const enrichedCourses = visibleCourses.map(c => {
      const catalogMatch = catalogData.find(cat => cat.courseCode === c.courseCode);
      
      const completedSegments = existingMarks
        .filter(m => m.courseCode === c.courseCode && m.series === c.series)
        .map(m => m.segment);

      return { 
        ...c, 
        title: catalogMatch?.title || (c.isXXPending ? "Waiting for exact code..." : "Course Title Pending"),
        completedSegments 
      };
    });

    return NextResponse.json({ courses: enrichedCourses });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  try {
    const body = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");
    
    // --- NEW FIX 3: Save exact XX course code to database ---
    if (body.action === "resolve_xx") {
       const updateKey = `resolvedXX.${body.uniqueId}`;
       await db.collection("users").updateOne(
         { email: session?.user?.email },
         { $set: { [updateKey]: body.resolvedCode } }
       );
       return NextResponse.json({ message: "Course code permanently saved." });
    }

    if (body.action === "hide") {
        await db.collection("users").updateOne(
        { email: session?.user?.email },
        { $addToSet: { hiddenMarksCourses: body.uniqueId } }
        );
        return NextResponse.json({ message: "Course hidden from dashboard" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}