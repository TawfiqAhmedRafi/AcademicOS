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
    
    // Fetch all active faculty members to populate the Advisor assignment dropdown
    const faculty = await db.collection("users")
      .find({ role: { $in: ["faculty", "advisor", "dept_head"] } })
      .project({ name: 1, email: 1, designation: 1 })
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json(faculty);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch faculty list" }, { status: 500 });
  }
}