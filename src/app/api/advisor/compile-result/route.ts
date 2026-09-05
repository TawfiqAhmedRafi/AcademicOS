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
    const { series, semester } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    // Fetch students who are doing Regular Exams OR Backlog Exams
    const students = await db.collection("users").find({
      role: "student",
      series: String(series),
      $or: [
        { formFillupStatus: "approved" },
        { backlogRegStatus: "approved" }
      ]
    }).toArray();

    if (students.length === 0) return NextResponse.json({ error: "No cleared students found." }, { status: 400 });

    // Fetch ALL courses (since backlogs can be from previous semesters)
    const courses = await db.collection("courses").find({}).toArray();
    const allMarks = await db.collection("course_marks").find({ series: Number(series) }).toArray();

    const compiledResults = [];

    // Process Each Student
    for (const student of students) {
      const roll = student.studentId || student.email.split('@')[0];
      const studentResult: any = {
        studentId: student._id,
        roll,
        name: student.name,
        courseGrades: [],
        backlogGrades: [],
        semesterGpa: 0,
        earnedCredits: 0,
        failedCourses: []
      };

      let totalGradePoints = 0;
      let totalEarnedCredits = 0;

      // HELPER: Processes a single course, automatically carrying forward old marks
      const processCourse = (courseId: string, isBacklog: boolean) => {
        const course = courses.find(c => c._id.toString() === courseId);
        if (!course) return;

        const courseUploads = allMarks.filter(m => m.courseCode === course.courseCode);
        
        // Group by segment and take the LATEST upload (Perfect for Backlog carry-forward)
        const latestUploadsBySegment: Record<string, any> = {};
        courseUploads.forEach(upload => {
          const existing = latestUploadsBySegment[upload.segment];
          if (!existing || new Date(upload.uploadedAt) > new Date(existing.uploadedAt)) {
            latestUploadsBySegment[upload.segment] = upload;
          }
        });

        let courseTotal = 0;
        let ctMarksCollector: number[] = [];

        Object.values(latestUploadsBySegment).forEach((upload: any) => {
          const studentMarkData = upload.marks?.find((m: any) => m.roll === roll);
          if (!studentMarkData) return;

          if (upload.segment.includes("Class Tests")) {
            if (studentMarkData.ct1 !== undefined) ctMarksCollector.push(studentMarkData.ct1);
            if (studentMarkData.ct2 !== undefined) ctMarksCollector.push(studentMarkData.ct2);
            if (studentMarkData.ct3 !== undefined) ctMarksCollector.push(studentMarkData.ct3);
            if (studentMarkData.ct4 !== undefined) ctMarksCollector.push(studentMarkData.ct4);
          } else {
            courseTotal += studentMarkData.mark || 0;
          }
        });

        courseTotal += calculateCTMarks(ctMarksCollector);
        const gradeScale = getGradeScale(courseTotal, isBacklog);

        const resultObj = {
          courseCode: course.courseCode,
          credits: course.credits,
          totalMarks: courseTotal,
          letterGrade: gradeScale.letter,
          gradePoint: gradeScale.point,
          isBacklog
        };

        if (isBacklog) {
          studentResult.backlogGrades.push(resultObj);
        } else {
          studentResult.courseGrades.push(resultObj);
          // Standard Rule: Failed courses don't penalize the current semester GPA
          if (gradeScale.point > 0) {
            totalEarnedCredits += course.credits;
            totalGradePoints += (course.credits * gradeScale.point);
          } else {
            studentResult.failedCourses.push(course.courseCode);
          }
        }
      };

      // A. Process Regular Courses
      if (student.formFillupStatus === "approved") {
        for (const courseId of (student.registeredCourses || [])) {
          processCourse(courseId, false);
        }
      }

      // B. Process Backlog Courses
      if (student.backlogRegStatus === "approved") {
        for (const courseId of (student.registeredBacklogs || [])) {
          processCourse(courseId, true);
        }
      }

      // C. Term GPA Calculation
      if (totalEarnedCredits > 0) {
        studentResult.semesterGpa = Number((totalGradePoints / totalEarnedCredits).toFixed(2));
      }
      studentResult.earnedCredits = totalEarnedCredits;

      // D. Cumulative CGPA Logic
      let cumulativePoints = totalGradePoints;
      let cumulativeCredits = totalEarnedCredits;

      // Add previous semesters
      (student.academicHistory || []).forEach((hist: any) => {
        cumulativePoints += (hist.semesterGpa * hist.earnedCredits);
        cumulativeCredits += hist.earnedCredits;
      });

      // Integrate newly passed backlogs into the global CGPA
      studentResult.backlogGrades.forEach((bg: any) => {
        if (bg.gradePoint > 0) {
          cumulativePoints += (bg.credits * bg.gradePoint);
          cumulativeCredits += bg.credits;
        } else {
          studentResult.failedCourses.push(bg.courseCode); // Still failing
        }
      });

      studentResult.cgpa = cumulativeCredits > 0 ? Number((cumulativePoints / cumulativeCredits).toFixed(2)) : 0;
      compiledResults.push(studentResult);
    }

    const draftPayload = {
      series: Number(series),
      semester,
      compiledBy: session.user.email,
      compiledAt: new Date(),
      status: "draft",
      results: compiledResults
    };

    await db.collection("draft_results").updateOne(
      { series: Number(series), semester },
      { $set: draftPayload },
      { upsert: true }
    );

    return NextResponse.json({ message: "Draft Result Sheet compiled successfully.", draft: draftPayload });
  } catch (error) {
    console.error("Result Compilation Error:", error);
    return NextResponse.json({ error: "Failed to compile results" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.advising_series) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const series = searchParams.get("series");
    const semester = searchParams.get("semester");

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
  if (!session?.user?.advising_series) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { series, semester, action } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    if (action === "submit_to_head") {
      await db.collection("draft_results").updateOne(
        { series: Number(series), semester },
        { $set: { status: "pending_head_approval", submittedAt: new Date() } }
      );
      return NextResponse.json({ message: "Draft successfully sent to the Department Head." });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}