import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
// --- FIX: Check for BOTH the 'admin' role OR the 'isAdmin' boolean flag ---
  if (!session?.user || (session.user.role !== "admin" && !session.user.isAdmin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // Execute multiple aggregations in parallel for speed
    const [
      totalUsers,
      roleStats,
      lockedAccounts,
      pendingSetups
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } }
      ]).toArray(),
      // Count users whose lockoutUntil date is in the future
      db.collection("users").countDocuments({ lockoutUntil: { $gt: new Date() } }),
      db.collection("users").countDocuments({ needs_setup: true })
    ]);

    // Format the role stats nicely
    const roles = roleStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return NextResponse.json({
      totalUsers,
      totalStudents: roles["student"] || 0,
      totalFaculty: (roles["faculty"] || 0) + (roles["advisor"] || 0) + (roles["dept_head"] || 0),
      lockedAccounts,
      pendingSetups,
      status: "Online"
    });

  } catch (error) {
    console.error("Failed to fetch admin overview:", error);
    return NextResponse.json({ error: "Failed to fetch overview data" }, { status: 500 });
  }
}