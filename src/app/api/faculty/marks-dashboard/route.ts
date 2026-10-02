import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// FIX: Prevent Next.js from aggressive caching so the dashboard updates instantly
export const dynamic = "force-dynamic";

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
        const rawCode = slot.courseCode || "";

        // --- FIX 1: Strict Split Logic ---
        if (rawCode.includes("/") || rawCode.includes(",")) {
            const splitCourseList = rawCode.split(/[,/]+/).map((c: string) => c.trim()).filter(Boolean);
            
            if (isSpecial) {
                splitCourseList.forEach((c: string) => extractedCodes.add(c));
            } else {
                if (slot.splitTeachers && Array.isArray(slot.splitTeachers)) {
                    slot.splitTeachers.forEach((teacherGroup: any, index: number) => {
                        if ((Array.isArray(teacherGroup) && teacherGroup.includes(initials)) || 
                            (typeof teacherGroup === 'string' && teacherGroup.includes(initials))) {
                            extractedCodes.add(splitCourseList[index] || splitCourseList[0]);
                        }
                    });
                } else if (slot.teachers && Array.isArray(slot.teachers)) {
                    const teacherIndex = slot.teachers.indexOf(initials);
                    if (teacherIndex !== -1 && splitCourseList[teacherIndex]) {
                        extractedCodes.add(splitCourseList[teacherIndex]);
                    }
                }
                if (extractedCodes.size === 0 && slot.teachers?.includes(initials)) {
                    extractedCodes.add(splitCourseList[0] || rawCode);
                }
            }
        } else {
            extractedCodes.add(rawCode);
        }

        extractedCodes.forEach(extractedCode => {
            const key = `reg-${slot.series}-${extractedCode}`;
            const isLocked = activeDrafts.some(draft => draft.series === slot.series && draft.semester === slot.semester);

            if (!courseMap.has(key)) {
              courseMap.set(key, {
                uniqueId: slot._id.toString(),
                courseCode: extractedCode, // Strict override
                title: extractedCode, // Strict override (prevents "ETE 2110 / ETE 2114" from bleeding through)
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

    // --- BACKLOG EXAMINER COURSES ---
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
          { _id: { $in: allBacklogRefs.map(id => { try { return new ObjectId(id); } catch(e){ return null; } }).filter((id): id is ObjectId => id !== null) } },
          { courseCode: { $in: allBacklogRefs } }
        ]
      }).toArray();

      const studentsWithBacklogCodes = (backlogStudents as any[]).map(s => {
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
        const rawCode = slot.courseCode || "";

        if (rawCode.includes("/") || rawCode.includes(",")) {
            const splitCourseList = rawCode.split(/[,/]+/).map((c: string) => c.trim()).filter(Boolean);
            if (isSpecial) {
                splitCourseList.forEach((c: string) => extractedCodes.add(c));
            } else {
                if (slot.splitTeachers && Array.isArray(slot.splitTeachers)) {
                    slot.splitTeachers.forEach((teacherGroup: any, index: number) => {
                        if ((Array.isArray(teacherGroup) && teacherGroup.includes(initials)) || 
                            (typeof teacherGroup === 'string' && teacherGroup.includes(initials))) {
                            extractedCodes.add(splitCourseList[index] || splitCourseList[0]);
                        }
                    });
                } else if (slot.teachers && Array.isArray(slot.teachers)) {
                    const teacherIndex = slot.teachers.indexOf(initials);
                    if (teacherIndex !== -1 && splitCourseList[teacherIndex]) {
                        extractedCodes.add(splitCourseList[teacherIndex]);
                    }
                }
            }
        } else {
            extractedCodes.add(rawCode);
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
                  title: extractedCode,
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

      const sessionUser = await db.collection("users").findOne({ email: session.user.email });
      const initials = sessionUser?.initials;
      if (!initials) return NextResponse.json({ error: "User initials missing." }, { status: 400 });

      const baseSlot = await db.collection("routine_slots").findOne({ _id: new ObjectId(uniqueId) });
      if (!baseSlot) return NextResponse.json({ error: "Base slot not found." }, { status: 404 });

      // --- FIX 2 & 3: BULK FORKING ENGINE ---
      const resolveAndForkSlots = async (targetCourseCode: string, targetType: string, targetCourseDoc: any) => {
          // Hunt down EVERY period in the week that matches the generic XX placeholder for this teacher
          const allMatchingSlots = await db.collection("routine_slots").find({
              series: baseSlot.series,
              semester: baseSlot.semester,
              courseCode: targetCourseCode, 
              type: targetType,
              teachers: initials
          }).toArray();

          for (const slot of allMatchingSlots) {
              const otherTeachers = (slot.teachers || []).filter((t: string) => t !== initials);

              if (otherTeachers.length > 0) {
                  // Clean: Pull this teacher OUT of the shared pool so Faculty B never sees it
                  await db.collection("routine_slots").updateOne(
                      { _id: slot._id },
                      { $pull: { teachers: initials } }
                  );

                  // Fork: Create a dedicated clone strictly for this teacher
                  const clonedSlot: any = { ...slot };
                  delete clonedSlot._id; 
                  clonedSlot.teachers = [initials];
                  clonedSlot.courseCode = targetCourseDoc.courseCode;
                  clonedSlot.courseName = targetCourseDoc.title;
                  clonedSlot.isXXPending = false;
                  clonedSlot.completedSegments = []; 
                  
                  if (clonedSlot.isSplit) {
                     clonedSlot.isSplit = false;
                     delete clonedSlot.splitTeachers;
                     delete clonedSlot.splitRooms;
                  }

                  await db.collection("routine_slots").insertOne(clonedSlot);
              } else {
                  // They are the only teacher attached, safe to overwrite in-place
                  await db.collection("routine_slots").updateOne(
                      { _id: slot._id },
                      { $set: { courseCode: targetCourseDoc.courseCode, courseName: targetCourseDoc.title, isXXPending: false } }
                  );
              }
          }
      };

      // 1. Resolve all periods for the Primary course the teacher just clicked
      await resolveAndForkSlots(baseSlot.courseCode, baseSlot.type, validCourse);

      // 2. AUTO-PAIRING MAGIC: Find the paired course in the catalog and lock its corresponding periods automatically!
      if (validCourse.pairedCourseCode) {
          const pairedCourse = await db.collection("courses").findOne({ courseCode: validCourse.pairedCourseCode });
          if (pairedCourse) {
              // If the main was theory, the paired is likely lab/sessional (and vice versa)
              const possibleTypes = pairedCourse.isSessional ? ["sessional", "lab"] : ["theory"];
              
              // Find the generic "XX" slot that corresponds to the paired type
              const pairedSlotBase = await db.collection("routine_slots").findOne({
                  series: baseSlot.series,
                  semester: baseSlot.semester,
                  courseCode: { $regex: "XX" },
                  type: { $in: possibleTypes },
                  teachers: initials
              });

              if (pairedSlotBase) {
                  await resolveAndForkSlots(pairedSlotBase.courseCode, pairedSlotBase.type, pairedCourse);
              }
          }
      }

      return NextResponse.json({ message: "Course securely locked and auto-paired." });
    }

    if (action === "hide") return NextResponse.json({ message: "Course hidden." });
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}