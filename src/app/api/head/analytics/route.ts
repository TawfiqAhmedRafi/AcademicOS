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

    // Run parallel aggregations for performance
    const [studentStats, facultyStats, totalCourses, activeSeries] = await Promise.all([
      db.collection("users").aggregate([
        { $match: { role: "student" } },
        { $group: { _id: "$series", count: { $sum: 1 } } },
        { $sort: { _id: -1 } } // Newest series first
      ]).toArray(),
      
      db.collection("users").aggregate([
        { $match: { role: { $in: ["faculty", "advisor", "dept_head"] } } },
        { $group: { _id: "$designation", count: { $sum: 1 } } }
      ]).toArray(),
      
      db.collection("courses").countDocuments(),
      
      db.collection("series").countDocuments({ status: "active" })
    ]);

    return NextResponse.json({
      studentStats: studentStats.map(s => ({ series: s._id, count: s.count })),
      facultyStats: facultyStats.map(f => ({ designation: f._id, count: f.count })),
      totalCourses,
      activeSeries
    });
  } catch (error) {
    console.error("Analytics fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}