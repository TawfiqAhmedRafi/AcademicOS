import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  const isHeadOrAdmin = session?.user?.role === "dept_head" || session?.user?.role === "admin" || !!session?.user?.isAdmin;
  if (!isHeadOrAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // 1. Fetch all faculty to resolve their initials
    const faculty = await db.collection("users")
      .find({ role: { $in: ["faculty", "advisor", "dept_head"] } })
      .project({ name: 1, initials: 1, email: 1, designation: 1 })
      .toArray();

    // 2. Aggregate routine_slots to get unique courses per series
    const allocations = await db.collection("routine_slots").aggregate([
      {
        $group: {
          _id: { series: "$series", courseCode: "$courseCode" },
          teachers: { $first: "$teachers" },
          type: { $first: "$type" }
        }
      },
      {
        $project: {
          _id: 0,
          series: "$_id.series",
          courseCode: "$_id.courseCode",
          teachers: 1,
          type: 1
        }
      },
      { $sort: { series: -1, courseCode: 1 } }
    ]).toArray();

    return NextResponse.json({ faculty, allocations });
  } catch (error) {
    console.error("Allocation fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch allocations" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const isHeadOrAdmin = session?.user?.role === "dept_head" || session?.user?.role === "admin" || !!session?.user?.isAdmin;
  if (!isHeadOrAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { series, courseCode, newTeachers } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    // Update ALL routine slots for this specific course and series
    await db.collection("routine_slots").updateMany(
      { series, courseCode },
      { $set: { teachers: newTeachers, updatedAt: new Date() } }
    );

    return NextResponse.json({ message: "Course allocation updated successfully." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update allocation" }, { status: 500 });
  }
}