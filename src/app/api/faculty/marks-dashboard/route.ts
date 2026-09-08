import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
    const activeDrafts = await db.collection("draft_results").find({
      series: { $in: activeSeries.map(s => Number(s.series)) }
    }).toArray();

    // --------------------------------------------------------
    // 1. FETCH REGULAR COURSES (n and n-1)
    // --------------------------------------------------------
    const orConditions = activeSeries.flatMap(s => {
      const prevSem = getPreviousSemester(s.currentSemester);
      const conditions = [{ series: Number(s.series), semester: s.currentSemester }];
      if (prevSem) conditions.push({ series: Number(s.series), semester: prevSem });
      return conditions;
    });

    const courseMap = new Map();
    
    if (orConditions.length > 0 && initials) {
      const slots = await db.collection("routine_slots").find({
        $and: [
          { $or: orConditions },
          {
            $or: [
              { teachers: initials },
              { type: { $in: ["project", "thesis", "seminar"] } }
            ]
          }
        ]
      }).toArray();
      
      slots.forEach(slot => {
        let extractedCodes = new Set<string>();
        const isSpecial = ["project", "thesis", "seminar"].includes(slot.type);

        // --- SMART INTERCEPT: Handle Split Courses (e.g. "ETE 2110 / ETE 2114") ---
        if (slot.isSplit && slot.splitTeachers && Array.isArray(slot.splitTeachers)) {
            // Split the code string by either "/" or "," to make it robust
            const splitCourseList = slot.courseCode.split(/[,/]+/).map((c: string) => c.trim()).filter(Boolean);
            
            if (isSpecial) {
                // Broadcast courses show all parts to everyone
                splitCourseList.forEach((c: string) => extractedCodes.add(c));
            } else {
                // Map the specific teacher's initials to the exact course in the split array
                slot.splitTeachers.forEach((teacherGroup: any, index: number) => {
                    if ((Array.isArray(teacherGroup) && teacherGroup.includes(initials)) || 
                        (typeof teacherGroup === 'string' && teacherGroup.includes(initials))) {
                        extractedCodes.add(splitCourseList[index] || slot.courseCode);
                    }
                });
                
                // Fallback just in case
                if (extractedCodes.size === 0 && slot.teachers?.includes(initials)) {
                    extractedCodes.add(slot.courseCode);
                }
            }
        } else {
            extractedCodes.add(slot.courseCode); // Normal Course
        }

        // Process each cleanly extracted code
        extractedCodes.forEach(extractedCode => {
            const key = `reg-${slot.series}-${extractedCode}`;
            const isLocked = activeDrafts.some(draft => draft.series === slot.series && draft.semester === slot.semester);

            if (!courseMap.has(key)) {
              courseMap.set(key, {
                uniqueId: slot._id.toString(),
                courseCode: extractedCode, // <-- Emits only the isolated course code!
                title: slot.courseName || extractedCode,
                series: slot.series,
                type: slot.type || 'theory',
                isSpecial,
                teacherCount: slot.teachers?.length || 1,
                completedSegments: slot.completedSegments || [],
                isXXPending: extractedCode.includes("XX"),
                isLocked,
                isBacklog: false
              });
            }
        });
      });
    }

    // --------------------------------------------------------
    // 2. FETCH BACKLOG EXAMINER COURSES
    // --------------------------------------------------------
    const activeSeriesStrings = activeSeries.map(s => String(s.series));
    const backlogStudents = await db.collection("users").find({
      role: "student",
      series: { $in: activeSeriesStrings },
      backlogRegStatus: "approved"
    }).toArray();

    if (backlogStudents.length > 0 && initials) {
      const allBacklogRefs = Array.from(new Set(backlogStudents.flatMap(s => s.registeredBacklogs || [])));
      const backlogCourseDocs = await db.collection("courses").find({
        $or: [
          { _id: { $in: allBacklogRefs.map(id => { try { return new ObjectId(id); } catch(e){ return null; } }).filter(Boolean) } },
          { courseCode: { $in: allBacklogRefs } }
        ]
      }).toArray();

      const studentsWithBacklogCodes = backlogStudents.map(s => {
        const codes = (s.registeredBacklogs || []).map((ref: string) => {
            const doc = backlogCourseDocs.find(c => c._id.toString() === ref || c.courseCode === ref);
            return doc ? doc.courseCode : null;
        }).filter(Boolean);
        return { ...s, backlogCodes: codes };
      });

      const teacherHistoricalSlots = await db.collection("routine_slots").find({
        $and: [
          { series: { $in: activeSeries.map(s => Number(s.series)) } },
          {
            $or: [
              { teachers: initials },
              { type: { $in: ["project", "thesis", "seminar"] } }
            ]
          }
        ]
      }).toArray();

      teacherHistoricalSlots.forEach(slot => {
        let extractedCodes = new Set<string>();
        const isSpecial = ["project", "thesis", "seminar"].includes(slot.type);

        // --- SMART INTERCEPT: Backlog extraction ---
        if (slot.isSplit && slot.splitTeachers && Array.isArray(slot.splitTeachers)) {
            const splitCourseList = slot.courseCode.split(/[,/]+/).map((c: string) => c.trim()).filter(Boolean);
            if (isSpecial) {
                splitCourseList.forEach((c: string) => extractedCodes.add(c));
            } else {
                slot.splitTeachers.forEach((teacherGroup: any, index: number) => {
                    if ((Array.isArray(teacherGroup) && teacherGroup.includes(initials)) || 
                        (typeof teacherGroup === 'string' && teacherGroup.includes(initials))) {
                        extractedCodes.add(splitCourseList[index] || slot.courseCode);
                    }
                });
            }
        } else {
            extractedCodes.add(slot.courseCode);
        }

        extractedCodes.forEach(extractedCode => {
            const relevantStudents = studentsWithBacklogCodes.filter(s => Number(s.series) === slot.series && s.backlogCodes.includes(extractedCode));
            
            if (relevantStudents.length > 0) {
              const key = `backlog-${slot.series}-${extractedCode}`;
              const activeSem = activeSeries.find(s => Number(s.series) === slot.series)?.currentSemester;
              const isLocked = activeDrafts.some(draft => draft.series === slot.series && draft.semester === activeSem);

              if (!courseMap.has(key)) {
                courseMap.set(key, {
                  uniqueId: `bklg_${slot._id.toString()}_${extractedCode}`, 
                  courseCode: extractedCode,
                  title: slot.courseName || extractedCode,
                  series: slot.series,
                  type: slot.type || 'theory',
                  isSpecial,
                  teacherCount: 1, 
                  completedSegments: slot.completedBacklogSegments || [], 
                  isXXPending: false,
                  isLocked,
                  isBacklog: true,
                  studentCount: relevantStudents.length
                });
              }
            }
        });
      });
    }

    return NextResponse.json({ courses: Array.from(courseMap.values()) });
  } catch (error) {
    console.error("Marks Dashboard Fetch Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["faculty", "dept_head", "advisor"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { action, uniqueId, resolvedCode } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    if (action === "resolve_xx" && resolvedCode) {
      const validCourse = await db.collection("courses").findOne({ courseCode: resolvedCode });
      if (!validCourse) return NextResponse.json({ error: "Invalid course code. Not found in catalog." }, { status: 400 });

      await db.collection("routine_slots").updateOne(
        { _id: new ObjectId(uniqueId) },
        { $set: { courseCode: validCourse.courseCode, courseName: validCourse.title, isXXPending: false } }
      );
      return NextResponse.json({ message: "Course code validated and locked." });
    }

    if (action === "hide") return NextResponse.json({ message: "Course hidden." });
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}