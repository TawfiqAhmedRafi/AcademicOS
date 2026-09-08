import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { logSystemAction } from "@/lib/logger";

// Helper to scrub old saved data
const cleanCourseCode = (code: string) => {
  if (code && code.includes(" / ")) {
    const firstCode = code.split(" / ")[0].trim();
    return firstCode.length > 2 ? firstCode.slice(0, -2) + "XX" : "Electives";
  }
  return code;
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.advising_series) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const series = session.user.advising_series.split(",")[0].trim();
    const client = await clientPromise;
    const db = client.db("academicos");

    const seriesConfig = await db.collection("series").findOne({ series });
    if (!seriesConfig) return NextResponse.json({ error: "Series not found" }, { status: 404 });

    const semester = seriesConfig.currentSemester;

    // Fetch existing calendar if any
    const calendar = await db.collection("academic_calendars").findOne({ series: Number(series), semester });

    // --- FIX: Clean up any old, long strings that were already saved to the database ---
    if (calendar && calendar.ctSchedule) {
      calendar.ctSchedule = calendar.ctSchedule.map((ct: any) => ({
        ...ct,
        courseCode: cleanCourseCode(ct.courseCode)
      }));
    }

    // Fetch Theory Courses for this semester to pre-fill the CT Table
    const courses = await db.collection("courses").find({ 
      $or: [{ semester: semester }, { level: semester }],
      isSessional: false,
      isProject: false
    }).toArray();

    const coreCourses = courses.filter(c => !c.isElective).map(c => c.courseCode);
    const electives = courses.filter(c => c.isElective);
    
    const defaultCtCourses = [...coreCourses];
    
    // Smart "XX" Elective Grouping for new calendars
    if (electives.length > 0) {
      const firstCode = electives[0].courseCode;
      const groupedCode = firstCode.length > 2 ? firstCode.slice(0, -2) + "XX" : "Electives";
      defaultCtCourses.push(groupedCode);
    }

    return NextResponse.json({ 
      series, 
      semester, 
      calendar, 
      defaultCtCourses 
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.advising_series) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { series, semester, scheduleEvents, ctSchedule, finalSchedule, isPublish } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    // Clean data before saving it again
    const cleanedCtSchedule = ctSchedule.map((ct: any) => ({
        ...ct,
        courseCode: cleanCourseCode(ct.courseCode)
    }));

    const payload = {
      series: Number(series),
      semester,
      scheduleEvents,
      ctSchedule: cleanedCtSchedule,
      finalSchedule,
      status: isPublish ? "published" : "draft",
      updatedAt: new Date(),
      updatedBy: session.user.email
    };

    await db.collection("academic_calendars").updateOne(
      { series: Number(series), semester },
      { $set: payload },
      { upsert: true }
    );

    if (isPublish) {
      await db.collection("notices").insertOne({
        title: `Academic Calendar Published`,
        content: `The official Academic Calendar for Semester ${semester} has been published by your Course Advisor. You can now view and download the PDF from your dashboard.`,
        type: 'system',
        series: String(series),
        author: session.user.name,
        createdAt: new Date(),
      });
      await logSystemAction("Calendar Published", "Audit", `Advisor published calendar for Series ${series} Sem ${semester}`);
    }

    return NextResponse.json({ message: isPublish ? "Calendar Published" : "Draft Saved" });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}