import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

// RUET Grade Mapping Logic
function getGradeScale(totalMarks: number) {
  const rounded = Math.round(totalMarks);
  if (rounded >= 80) return { letter: "A+", point: 4.0 };
  if (rounded >= 75) return { letter: "A", point: 3.75 };
  if (rounded >= 70) return { letter: "A-", point: 3.5 };
  if (rounded >= 65) return { letter: "B+", point: 3.25 };
  if (rounded >= 60) return { letter: "B", point: 3.0 };
  if (rounded >= 55) return { letter: "B-", point: 2.75 };
  if (rounded >= 50) return { letter: "C+", point: 2.5 };
  if (rounded >= 45) return { letter: "C", point: 2.25 };
  if (rounded >= 40) return { letter: "D", point: 2.0 };
  return { letter: "F", point: 0.0 };
}

// Math Helper: Best 3 Average out of N Class Tests
function calculateCTMarks(ctMarksArray: number[]) {
  if (ctMarksArray.length === 0) return 0;
  // Sort descending
  const sorted = ctMarksArray.sort((a, b) => b - a);
  // Take top 3 (or less if fewer were taken)
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

    // 1. Fetch all students cleared for this semester
    const students = await db.collection("users").find({
      role: "student",
      series: String(series),
      formFillupStatus: "approved"
    }).toArray();

    if (students.length === 0) return NextResponse.json({ error: "No cleared students found." }, { status: 400 });

    // 2. Fetch the Curriculum and the Uploaded Marks
    const courses = await db.collection("courses").find({ semester }).toArray();
    const allMarks = await db.collection("course_marks").find({ series: Number(series) }).toArray();

    const compiledResults = [];

    // 3. Process Each Student
    for (const student of students) {
      const roll = student.studentId || student.email.split('@')[0];
      const studentResult: any = {
        studentId: student._id,
        roll,
        name: student.name,
        courseGrades: [],
        semesterGpa: 0,
        earnedCredits: 0,
        failedCourses: []
      };

      let totalGradePoints = 0;
      let totalEarnedCredits = 0;

      // 4. Process Each Registered Course
      for (const courseId of (student.registeredCourses || [])) {
        const course = courses.find(c => c._id.toString() === courseId);
        if (!course) continue;

        // Extract all marks uploaded by any teacher for this specific course & student
        const courseUploads = allMarks.filter(m => m.courseCode === course.courseCode);
        
        let courseTotal = 0;
        let ctMarksCollector: number[] = [];

        courseUploads.forEach(upload => {
          const studentMarkData = upload.marks?.find((m: any) => m.roll === roll);
          if (!studentMarkData) return;

          // Merge CTs for Averaging (handles both 1-teacher 4-CTs and 2-teacher 2-CTs seamlessly)
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
        
        const gradeScale = getGradeScale(courseTotal);

        studentResult.courseGrades.push({
          courseCode: course.courseCode,
          credits: course.credits,
          totalMarks: courseTotal,
          letterGrade: gradeScale.letter,
          gradePoint: gradeScale.point
        });

        // 5. Apply the Specific Exclude-Failed-Credits Rule
        if (gradeScale.point > 0) {
          totalEarnedCredits += course.credits;
          totalGradePoints += (course.credits * gradeScale.point);
        } else {
          studentResult.failedCourses.push(course.courseCode);
        }
      }

      // 6. Semester GPA Calculation (Denominator completely ignores failed credits)
      if (totalEarnedCredits > 0) {
        studentResult.semesterGpa = Number((totalGradePoints / totalEarnedCredits).toFixed(2));
      }
      studentResult.earnedCredits = totalEarnedCredits;

      // 7. CGPA Calculation (Merging with academic history)
      let cumulativePoints = totalGradePoints;
      let cumulativeCredits = totalEarnedCredits;

      (student.academicHistory || []).forEach((hist: any) => {
        cumulativePoints += (hist.gpa * hist.earnedCredits);
        cumulativeCredits += hist.earnedCredits;
      });

      studentResult.cgpa = cumulativeCredits > 0 ? Number((cumulativePoints / cumulativeCredits).toFixed(2)) : 0;

      compiledResults.push(studentResult);
    }

    // 8. Save to Drafts for Head's Approval
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

    if (!series || !semester) return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("academicos");

    const draft = await db.collection("draft_results").findOne({ 
      series: Number(series), 
      semester 
    });

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