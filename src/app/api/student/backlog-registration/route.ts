import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { createNotification, getSeriesAdvisorUserIds } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user || !user.series) return NextResponse.json({ error: "Student series not found" }, { status: 404 });

    const seriesConfig = await db.collection("series").findOne({ series: user.series });
    if (!seriesConfig) return NextResponse.json({ error: "Series configuration not found" }, { status: 404 });

    // ELIGIBILITY ENGINE: Only courses from the immediate previous year are allowed.
    const currentYear = parseInt(seriesConfig.currentSemester.split('-')[0]);
    const targetYear = currentYear - 1; 

    // Fetch the specific backlog courses from the catalog
    const allBacklogCodes = user.activeBacklogs || [];
    const backlogCourses = await db.collection("courses").find({ 
      courseCode: { $in: allBacklogCodes } 
    }).toArray();

    // Filter to strictly match the (CurrentYear - 1) rule
    const eligibleCourses = backlogCourses.filter(course => 
      course.semester.startsWith(String(targetYear))
    );

    return NextResponse.json({
      status: user.backlogRegStatus || "unregistered",
      registeredBacklogs: user.registeredBacklogs || [],
      seriesConfig,
      eligibleCourses
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { selectedCourseIds } = await req.json();
    
    // HARD LIMIT: Max 5 backlog courses
    if (selectedCourseIds.length > 5) {
        return NextResponse.json({ error: "You cannot register for more than 5 backlog courses." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { 
          backlogRegStatus: "pending", 
          registeredBacklogs: selectedCourseIds,
          updatedAt: new Date()
        } 
      }
    );

    // Notify series advisor
    const userDoc = await db.collection("users").findOne({ email: session.user.email });
    if (userDoc?.series) {
      const advisorUserIds = await getSeriesAdvisorUserIds(db, userDoc.series);
      await createNotification({
        title: `Backlog Registration Submitted`,
        message: `${userDoc.name || userDoc.student_id || "A student"} (${userDoc.student_id || ""}) submitted backlog registration.`,
        category: "approval",
        link: "/dashboard/approvals",
        audience: {
          roles: ["advisor", "dept_head"],
          series: [String(userDoc.series)],
          userIds: advisorUserIds,
        },
        actorId: session.user.id,
        dedupeKey: `backlog_sub_${userDoc.student_id || userDoc.email}`,
      });
    }

    return NextResponse.json({ message: "Backlog Registration submitted to Advisor." });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}