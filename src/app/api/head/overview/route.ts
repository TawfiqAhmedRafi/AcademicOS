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

    const [studentStats, facultyRaw, totalCourses, seriesList] = await Promise.all([
      db.collection("users").aggregate([
        { $match: { role: "student" } },
        { $group: { _id: "$series", count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
      ]).toArray(),
      
      // Fetch all faculty with their availability flag
      db.collection("users")
        .find({ role: { $in: ["faculty", "advisor", "dept_head"] } })
        .project({ designation: 1, isAvailable: 1 })
        .toArray(),
        
      db.collection("courses").countDocuments(),
      db.collection("series").find({ status: "active" }).toArray(),
    ]);

    // Check for structural bottlenecks
    const unassignedSeries = seriesList
      .filter(s => !s.advisor1?.email && !s.advisor2?.email)
      .map(s => s.series);

    // --- NEW: Process Faculty Availability Stats ---
    const availableStatsMap: Record<string, number> = {};
    const onLeaveStatsMap: Record<string, number> = {};
    let totalFaculty = 0;
    let totalOnLeave = 0;

    facultyRaw.forEach(f => {
      totalFaculty++;
      const desig = f.designation || "Unknown";
      
      if (f.isAvailable === false) {
        totalOnLeave++;
        onLeaveStatsMap[desig] = (onLeaveStatsMap[desig] || 0) + 1;
      } else {
        availableStatsMap[desig] = (availableStatsMap[desig] || 0) + 1;
      }
    });

    // Sort mappings by Academic Rank
    const rankWeights: Record<string, number> = { "Professor": 1, "Associate Professor": 2, "Assistant Professor": 3, "Lecturer": 4 };
    const sortDesignations = (a: any, b: any) => (rankWeights[a.designation] || 99) - (rankWeights[b.designation] || 99);

    const facultyAvailableStats = Object.entries(availableStatsMap)
      .map(([d, c]) => ({ designation: d, count: c }))
      .sort(sortDesignations);
        
    const facultyOnLeaveStats = Object.entries(onLeaveStatsMap)
      .map(([d, c]) => ({ designation: d, count: c }))
      .sort(sortDesignations);

    return NextResponse.json({
      totalStudents: studentStats.reduce((acc, curr) => acc + curr.count, 0),
      totalFaculty,
      totalOnLeave,
      activeSeries: seriesList.length,
      totalCourses,
      unassignedSeries,
      studentStats: studentStats.map(s => ({ series: s._id, count: s.count })),
      facultyAvailableStats,
      facultyOnLeaveStats
    });
  } catch (error) {
    console.error("Failed to fetch admin overview:", error);
    return NextResponse.json({ error: "Failed to fetch overview data" }, { status: 500 });
  }
}