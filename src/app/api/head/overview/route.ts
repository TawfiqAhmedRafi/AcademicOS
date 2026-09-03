import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    const [studentStats, facultyStats, totalCourses, seriesList] = await Promise.all([
      db.collection("users").aggregate([
        { $match: { role: "student" } },
        { $group: { _id: "$series", count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
      ]).toArray(),
      db.collection("users").aggregate([
        { $match: { role: { $in: ["faculty", "advisor", "dept_head"] } } },
        { $group: { _id: "$designation", count: { $sum: 1 } } }
      ]).toArray(),
      db.collection("courses").countDocuments(),
      db.collection("series").find({ status: "active" }).toArray(),
    ]);

    // Check for structural bottlenecks
    const unassignedSeries = seriesList
      .filter(s => !s.advisor1?.email && !s.advisor2?.email)
      .map(s => s.series);

    return NextResponse.json({
      totalStudents: studentStats.reduce((acc, curr) => acc + curr.count, 0),
      totalFaculty: facultyStats.reduce((acc, curr) => acc + curr.count, 0),
      activeSeries: seriesList.length,
      totalCourses,
      unassignedSeries,
      studentStats: studentStats.map(s => ({ series: s._id, count: s.count })),
      facultyStats: facultyStats.map(f => ({ designation: f._id, count: f.count }))
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}