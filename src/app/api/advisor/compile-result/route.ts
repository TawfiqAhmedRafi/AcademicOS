import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

// RUET Grade Mapping & Cap Logic
function getGradeScale(totalMarks: number, isBacklog: boolean = false) {
  const rounded = Math.round(totalMarks);
  let letter = "F";
  let point = 0.0;

  if (rounded >= 80) { letter = "A+"; point = 4.0; }
  else if (rounded >= 75) { letter = "A"; point = 3.75; }
  else if (rounded >= 70) { letter = "A-"; point = 3.5; }
  else if (rounded >= 65) { letter = "B+"; point = 3.25; }
  else if (rounded >= 60) { letter = "B"; point = 3.0; }
  else if (rounded >= 55) { letter = "B-"; point = 2.75; }
  else if (rounded >= 50) { letter = "C+"; point = 2.5; }
  else if (rounded >= 45) { letter = "C"; point = 2.25; }
  else if (rounded >= 40) { letter = "D"; point = 2.0; }

  // THE BACKLOG INTERCEPTOR: Hard cap at B+ (3.25)
  if (isBacklog && point > 3.25) {
    return { letter: "B+", point: 3.25 };
  }

  return { letter, point };
}

// Math Helper: Best 3 Average
function calculateCTMarks(ctMarksArray: number[]) {
  if (ctMarksArray.length === 0) return 0;
  const sorted = ctMarksArray.sort((a, b) => b - a);
  const top3 = sorted.slice(0, 3);
  const sum = top3.reduce((acc, val) => acc + val, 0);
  return Number((sum / top3.length).toFixed(2));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.advising_series) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { series, semester, isBacklog } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    let query: any = { role: "student", series: String(series) };
    
    // If Backlog Mode: Fetch ALL students in the series to make the Unified Sheet
    // If Regular Mode: Fetch only students approved for the current semester
    if (!isBacklog) {
       query.$or = [
        { formFillupStatus: "approved" },
        { academicHistory: { $elemMatch: { semester: semester, resultStatus: "pending" } } }
      ];
    }

    const students = await db.collection("users").find(query).toArray();
    if (students.length === 0) return NextResponse.json({ error: "No students found for this series." }, { status: 400 });

    const courses = await db.collection("courses").find({}).toArray();
    const allMarks = await db.collection("course_marks").find({ series: Number(series) }).toArray();

    const compiledResults = [];

    for (const student of students) {
      const roll = student.studentId || student.email.split('@')[0];
      const studentResult: any = {
        studentId: student._id.toString(),
        roll,
        name: student.name,
        courseGrades: [],
        backlogGrades: [],
        semesterGpa: 0,
        earnedCredits: 0,
        failedCourses: []
      };

      const frozenSemester = student.academicHistory?.find((h: any) => h.semester === semester && h.resultStatus === "pending");

      const rawCourses = frozenSemester ? frozenSemester.courses : (student.registeredCourses || []);
      const rawBacklogs = frozenSemester ? (frozenSemester.backlogs || []) : (student.registeredBacklogs || []);
      
      const isRegApproved = frozenSemester ? (frozenSemester.formFillupStatus === "approved") : (student.formFillupStatus === "approved");
      const isBacklogApproved = frozenSemester ? (frozenSemester.backlogRegStatus === "approved") : (student.backlogRegStatus === "approved");

      const targetCourseIds = rawCourses.map((c: any) => typeof c === 'string' ? c : (c.courseCode || c._id?.toString()));
      const targetBacklogIds = rawBacklogs.map((c: any) => typeof c === 'string' ? c : (c.courseCode || c._id?.toString()));

      let totalGradePoints = 0;
      let totalEarnedCredits = 0;

      const processCourse = (courseId: string, processingBacklog: boolean) => {
        const course = courses.find(c => c._id.toString() === courseId || c.courseCode === courseId);
        if (!course) return;

        const studentUploads = allMarks.filter(m => m.courseCode === course.courseCode && m.marks?.some((sm: any) => sm.roll === roll));
        const continuousUploads = studentUploads.filter(u => !u.segment.includes("Final") && !u.segment.includes("Viva") && !u.segment.includes("Defense") && !u.segment.includes("Showcase"));
        const terminalUploads = studentUploads.filter(u => u.segment.includes("Final") || u.segment.includes("Viva") || u.segment.includes("Defense") || u.segment.includes("Showcase"));

        let courseTotal = 0;
        let ctMarksCollector: number[] = [];

        const latestContinuous: Record<string, any> = {};
        continuousUploads.forEach(u => {
            const key = `${u.segment}_${u.teacherEmail}`;
            if (!latestContinuous[key] || new Date(u.uploadedAt) > new Date(latestContinuous[key].uploadedAt)) {
                latestContinuous[key] = u;
            }
        });

        Object.values(latestContinuous).forEach((upload: any) => {
            const mData = upload.marks.find((m:any) => m.roll === roll);
            if (upload.segment.includes("Class Tests")) {
                if (mData.ct1 !== undefined) ctMarksCollector.push(mData.ct1);
                if (mData.ct2 !== undefined) ctMarksCollector.push(mData.ct2);
                if (mData.ct3 !== undefined) ctMarksCollector.push(mData.ct3);
                if (mData.ct4 !== undefined) ctMarksCollector.push(mData.ct4);
            } else {
                courseTotal += mData.mark || 0;
            }
        });

        courseTotal += calculateCTMarks(ctMarksCollector);

        const sortedTerminal = terminalUploads.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        
        if (processingBacklog && sortedTerminal.length > 0) {
            const backlogPeriodDate = new Date(sortedTerminal[0].uploadedAt);
            const validTerminalUploads = sortedTerminal.filter(u => 
                (backlogPeriodDate.getTime() - new Date(u.uploadedAt).getTime()) < (30 * 24 * 60 * 60 * 1000) 
            );
            
            const latestTerminal: Record<string, any> = {};
            validTerminalUploads.forEach(u => {
                const key = `${u.segment}_${u.teacherEmail}`;
                if (!latestTerminal[key] || new Date(u.uploadedAt) > new Date(latestTerminal[key].uploadedAt)) latestTerminal[key] = u;
            });

            Object.values(latestTerminal).forEach((upload: any) => {
                courseTotal += upload.marks.find((m:any) => m.roll === roll).mark || 0;
            });

        } else {
            const latestTerminal: Record<string, any> = {};
            sortedTerminal.forEach(u => {
                const key = `${u.segment}_${u.teacherEmail}`;
                if (!latestTerminal[key] || new Date(u.uploadedAt) > new Date(latestTerminal[key].uploadedAt)) latestTerminal[key] = u;
            });
            Object.values(latestTerminal).forEach((upload: any) => {
                courseTotal += upload.marks.find((m:any) => m.roll === roll).mark || 0;
            });
        }

        const gradeScale = getGradeScale(courseTotal, processingBacklog);
        const resultObj = {
          courseCode: course.courseCode,
          credits: course.credits,
          totalMarks: courseTotal,
          letterGrade: gradeScale.letter,
          gradePoint: gradeScale.point,
          isBacklog: processingBacklog
        };

        if (processingBacklog) {
          studentResult.backlogGrades.push(resultObj);
        } else {
          studentResult.courseGrades.push(resultObj);
          if (gradeScale.point > 0) {
            totalEarnedCredits += course.credits;
            totalGradePoints += (course.credits * gradeScale.point);
          } else {
            studentResult.failedCourses.push(course.courseCode);
          }
        }
      };

      // --- SPLIT PROCESSING BASED ON MODE ---
      if (!isBacklog && isRegApproved) {
        for (const courseId of targetCourseIds) processCourse(courseId, false);
      }

      if (isBacklog && isBacklogApproved) {
        for (const courseId of targetBacklogIds) processCourse(courseId, true);
      }

      if (!isBacklog) {
        if (totalEarnedCredits > 0) studentResult.semesterGpa = Number((totalGradePoints / totalEarnedCredits).toFixed(2));
        studentResult.earnedCredits = totalEarnedCredits;
      }

      // --- CUMULATIVE CGPA LOGIC ---
      let cumulativePoints = !isBacklog ? totalGradePoints : 0;
      let cumulativeCredits = !isBacklog ? totalEarnedCredits : 0;

      (student.academicHistory || []).forEach((hist: any) => {
        cumulativePoints += (hist.semesterGpa * hist.earnedCredits); 
        cumulativeCredits += hist.earnedCredits;
      });

      // Integrate newly passed backlogs into global CGPA (both for regular and backlog runs)
      // Because backlogs cleared *during* a regular semester should also boost the global CGPA
      studentResult.backlogGrades.forEach((bg: any) => {
        if (bg.gradePoint > 0) {
          cumulativePoints += (bg.credits * bg.gradePoint);
          cumulativeCredits += bg.credits;
        } else {
          studentResult.failedCourses.push(bg.courseCode); 
        }
      });

      studentResult.cgpa = cumulativeCredits > 0 ? Number((cumulativePoints / cumulativeCredits).toFixed(2)) : (student.cgpa || 0);
      compiledResults.push(studentResult);
    }

    const draftPayload = {
      series: Number(series),
      semester: isBacklog ? `Backlogs_${semester}` : semester, // Unique key for backlog drafts
      compiledBy: session.user.email,
      compiledAt: new Date(),
      status: "draft",
      isBacklogDraft: isBacklog,
      results: compiledResults
    };

    await db.collection("draft_results").updateOne(
      { series: Number(series), semester: draftPayload.semester },
      { $set: draftPayload },
      { upsert: true }
    );

    return NextResponse.json({ message: "Draft Compiled successfully" }, { status: 201 });
  } catch (error) {
    console.error("Result Compilation Error:", error);
    return NextResponse.json({ error: "Failed to compile results" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["advisor", "dept_head"].includes(session.user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const series = searchParams.get("series");
    let semester = searchParams.get("semester");
    const isBacklog = searchParams.get("isBacklog") === "true";

    if (isBacklog) semester = `Backlogs_${semester}`;

    const client = await clientPromise;
    const db = client.db("academicos");
    const draft = await db.collection("draft_results").findOne({ series: Number(series), semester });

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "advisor") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { series, action, isBacklog } = await req.json();
    let { semester } = await req.json();
    if (isBacklog) semester = `Backlogs_${semester}`;

    const client = await clientPromise;
    const db = client.db("academicos");

    if (action === "submit_to_head") {
      await db.collection("draft_results").updateOne(
        { series: Number(series), semester },
        { $set: { status: "pending_head_approval", submittedAt: new Date() } }
      );
      return NextResponse.json({ message: "Submitted to Head" });
    }

    if (action === "unlock_draft") {
      await db.collection("draft_results").deleteOne({ series: Number(series), semester });
      return NextResponse.json({ message: "Draft deleted." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}