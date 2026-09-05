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

    rawSlots.forEach((slot: any) => {
      let finalCourseCode = slot.courseCode;
      let teacherCount = slot.teachers?.length || 1;
      
      // FLAW 2 FIX: Hard Split Logic by Index mapped to generic string splitting
      if (slot.courseCode.includes('/')) {
        const splitCodes = slot.courseCode.split('/').map((c: string) => c.trim());
        const teacherIndex = slot.teachers?.findIndex((t: string) => t === user.initials) || 0;
        
        if (splitCodes[teacherIndex]) {
          finalCourseCode = splitCodes[teacherIndex];
          teacherCount = 1; // It's split, so this teacher handles this specific course alone
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

      const uniqueId = `${finalCourseCode}_${slot.series}`;
      if (!assignedCourses.find(c => c.uniqueId === uniqueId)) {
        assignedCourses.push({
          uniqueId,
          courseCode: finalCourseCode,
          series: slot.series,
          type: slot.type.includes('lab') || slot.type.includes('sessional') ? 'sessional' : 'theory',
          isSpecial: false,
          teacherCount // <-- FLAW 1 FIX: Store teacher count
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
        const uniqueId = `${specialCourse.courseCode}_${series.series}`;
        if (!assignedCourses.find(c => c.uniqueId === uniqueId)) {
          assignedCourses.push({
            uniqueId,
            courseCode: specialCourse.courseCode,
            series: Number(series.series),
            type: 'special',
            isSpecial: true,
            teacherCount: 1 
          });
        }
      });
    });

    const hiddenCourses = user.hiddenMarksCourses || [];
    const visibleCourses = assignedCourses.filter(c => !hiddenCourses.includes(c.uniqueId));

    // FLAW 3 FIX: Fetch already uploaded marks to verify saved status
    const existingMarks = await db.collection("course_marks").find({
      teacherEmail: session.user.email
    }).project({ courseCode: 1, series: 1, segment: 1 }).toArray();

    const allCourseCodes = [...new Set(visibleCourses.map(c => c.courseCode.replace("XX", "")) )];
    const catalogData = await db.collection("courses").find({ 
      courseCode: { $regex: new RegExp(allCourseCodes.join("|"), "i") } 
    }).toArray();

    const enrichedCourses = visibleCourses.map(c => {
      const catalogMatch = catalogData.find(cat => c.courseCode.includes("XX") ? cat.courseCode.startsWith(c.courseCode.replace("XX", "")) : cat.courseCode === c.courseCode);
      
      // Map completed segments for this exact course and series
      const completedSegments = existingMarks
        .filter(m => m.courseCode === c.courseCode && m.series === c.series)
        .map(m => m.segment);

      return { 
        ...c, 
        title: catalogMatch?.title || "Course Title Pending",
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
    const { uniqueId } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");
    
    await db.collection("users").updateOne(
      { email: session?.user?.email },
      { $addToSet: { hiddenMarksCourses: uniqueId } }
    );
    return NextResponse.json({ message: "Course hidden from dashboard" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to hide course" }, { status: 500 });
  }
}