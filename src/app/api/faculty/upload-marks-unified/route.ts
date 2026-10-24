import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import * as XLSX from "xlsx";
import { logSystemAction } from "@/lib/logger";
import { getUnifiedColumns } from "@/lib/markSegments";

// Unified (single sheet) marks upload.
// The sheet is split server-side into the exact same per-segment `course_marks`
// documents that the separate per-segment upload produces, so the tabulation
// engine (advisor/compile-result) consumes it with zero changes.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !["faculty", "advisor", "dept_head"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const courseCode = formData.get("courseCode") as string;
    const series = formData.get("series") as string;
    const courseType = (formData.get("type") as string) || "theory";
    const teacherCount = Number(formData.get("teacherCount")) || 1;

    if (!file || !courseCode || !series) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Same segment division as the separate cards on the dashboard
    const columns = getUnifiedColumns({ courseCode, type: courseType, teacherCount, isBacklog: false });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    if (data.length === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    // --- TEMPLATE VALIDATION: guard against uploading the wrong course's sheet ---
    const sheetHeaders = (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as any[] || [])
      .map((h) => String(h ?? "").trim());
    const requiredHeaders = ["Roll Number", ...columns.map((c) => c.header)];
    const missing = requiredHeaders.filter((h) => !sheetHeaders.includes(h));
    if (missing.length > 0) {
      return NextResponse.json({
        error: `Template mismatch. Missing column(s): ${missing.join(", ")}. Please download the unified template for this course.`
      }, { status: 400 });
    }

    // segment -> marks[] (identical shape to the separate upload route)
    const segmentMarks = new Map<string, any[]>();
    columns.forEach((c) => { if (!segmentMarks.has(c.segment)) segmentMarks.set(c.segment, []); });

    for (const row of data) {
      const roll = row["Roll Number"]?.toString().trim();
      if (!roll || roll === "No approved students" || roll === "No approved backlog students") continue;

      const perSegment = new Map<string, any>();
      columns.forEach((c) => {
        if (!perSegment.has(c.segment)) perSegment.set(c.segment, { roll });
        perSegment.get(c.segment)[c.field] = Number(row[c.header]) || 0;
      });

      perSegment.forEach((markData, segment) => segmentMarks.get(segment)!.push(markData));
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    // --- TABULATION LOCKOUT ENFORCEMENT (same rule as separate upload) ---
    const slot = await db.collection("routine_slots").findOne({ series: Number(series), courseCode });
    if (slot) {
      const draft = await db.collection("draft_results").findOne({ series: Number(series), semester: slot.semester });
      if (draft) {
        return NextResponse.json({
          error: "Tabulation Lockout: The Course Advisor is currently compiling a draft. Uploads are strictly locked."
        }, { status: 403 });
      }
    }

    const uploadedAt = new Date();
    const segments = Array.from(segmentMarks.keys());

    await db.collection("course_marks").bulkWrite(
      segments.map((segment) => ({
        updateOne: {
          filter: { courseCode, series: Number(series), segment, teacherEmail: session.user.email },
          update: {
            $set: {
              marks: segmentMarks.get(segment),
              uploadedAt,
              teacherName: session.user.name,
              isBacklog: false,
              uploadMode: "unified"
            }
          },
          upsert: true
        }
      }))
    );

    await db.collection("routine_slots").updateOne(
      { series: Number(series), courseCode },
      { $addToSet: { completedSegments: { $each: segments } } }
    );

    await logSystemAction(
      "Marks Uploaded",
      "Audit",
      `${session.user.name} uploaded UNIFIED marks (${segments.join(", ")}) for ${courseCode} (Series ${series})`
    );

    return NextResponse.json({ message: `Unified sheet processed: ${segments.length} segments saved.` });
  } catch (error: any) {
    console.error("Unified Marks Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse and save marks" }, { status: 500 });
  }
}
