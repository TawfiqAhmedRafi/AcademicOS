import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // Fetch basic public info for the PDF sidebar
    const faculty = await db.collection("users")
      .find({ role: { $in: ["faculty", "advisor", "dept_head"] } })
      .project({ name: 1, initials: 1, designation: 1, role: 1 })
      .toArray();

    return NextResponse.json(faculty);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch faculty list" }, { status: 500 });
  }
}