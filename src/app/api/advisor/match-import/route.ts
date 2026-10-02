import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.advising_series) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { series, type, course, items } = await req.json();

    const seriesArray = session.user.advising_series.split(",").map((s) => s.trim());
    if (!seriesArray.includes(series)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    // Ensure the course has the ETE prefix correctly formatted
    const dbCourse = course === "4200" || course === "ETE4200" ? "ETE4200" 
      : course.startsWith("ETE") ? course : `ETE${course}`;

    // Double check it's not locked
    const existing = await db.collection("matchitems").countDocuments({ series, course: dbCourse, type });
    if (existing > 0) {
      return NextResponse.json({ error: "Data already uploaded for this category" }, { status: 400 });
    }

    const batchId = randomUUID();

    const docs = items.map((item: any) => ({
      id: type.charAt(0) + randomUUID().replace(/-/g, '').substring(0, 10),
      student_id: item.roll || item.student_id,
      title: item.title,
      description: item.abstract || item.description || "",
      series,
      type,
      course: dbCourse,
      source: "aos_match",
      importBatch: batchId,
      createdAt: new Date(),
    }));

    await db.collection("matchitems").insertMany(docs);
    
    // Auto-trigger reindex (optimistic, don't wait for it)
    fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/match/reindex`, { method: "POST" }).catch(console.error);

    return NextResponse.json({ success: true, count: docs.length });
  } catch (error: any) {
    console.error("Match Import Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
