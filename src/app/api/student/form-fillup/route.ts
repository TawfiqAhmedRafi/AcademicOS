import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { createNotification, getSeriesAdvisorUserIds } from "@/lib/notifications";
import { ObjectId } from "mongodb";

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

    const registeredCourses = user.registeredCourses || [];
    const courseObjectIds = registeredCourses.map((id: string) => {
      try { return new ObjectId(id); } catch (e) { return null; }
    }).filter(Boolean);

    const courses = await db.collection("courses")
      .find({ _id: { $in: courseObjectIds } })
      .sort({ courseCode: 1 })
      .toArray();
// --- NEW: Fetch the entire catalog to map historical titles ---
    const allCourses = await db.collection("courses").find({}).project({ courseCode: 1, title: 1, credits: 1 }).toArray();
    return NextResponse.json({
      registrationStatus: user.registrationStatus || "unregistered",
      formFillupStatus: user.formFillupStatus || "unregistered",
      academicHistory: user.academicHistory || [], // <-- NEW: Fetch History
      seriesConfig,
      courses, 
      allCourses // <-- Export it here
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { 
          formFillupStatus: "pending", 
          updatedAt: new Date()
        } 
      }
    );

    // Notify series advisor
    const userDoc = await db.collection("users").findOne({ email: session.user.email });
    if (userDoc?.series) {
      const advisorUserIds = await getSeriesAdvisorUserIds(db, userDoc.series);
      await createNotification({
        title: `Form Fill-up Submitted`,
        message: `${userDoc.name || userDoc.student_id || "A student"} (${userDoc.student_id || ""}) submitted semester form fill-up.`,
        category: "approval",
        link: "/dashboard/approvals",
        audience: {
          roles: ["advisor", "dept_head"],
          series: [String(userDoc.series)],
          userIds: advisorUserIds,
        },
        actorId: session.user.id,
        dedupeKey: `ff_sub_${userDoc.student_id || userDoc.email}`,
      });
    }

    return NextResponse.json({ message: "Form Fill-up submitted successfully to Advisor." });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}