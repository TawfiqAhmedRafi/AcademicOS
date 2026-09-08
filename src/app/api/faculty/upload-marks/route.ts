import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import * as XLSX from "xlsx";
import { logSystemAction } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!["faculty", "advisor", "dept_head"].includes(session?.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const courseCode = formData.get("courseCode") as string;
    const series = formData.get("series") as string;
    
    const rawSegment = formData.get("segment") as string;
    const segment = rawSegment ? rawSegment.trim() : "";
    
    // --- NEW: Intercept Backlog Flag ---
    const isBacklog = formData.get("isBacklog") === "true";

    if (!file || !courseCode || !series || !segment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    const processedMarks = [];

    for (const row of data as any[]) {
      const roll = row["Roll Number"]?.toString().trim();
      if (!roll || roll === "No approved students" || roll === "No approved backlog students") continue;

      let markData: any = { roll };

      // ALGORITHM 1: Attendance Calculation
      if (segment === "Attendance") {
        const total = Number(row["Total Classes"]);
        const attended = Number(row["Attended Classes"]);
        
        if (isNaN(total) || isNaN(attended) || total === 0) {
            markData.mark = 0;
        } else {
            const percentage = (attended / total) * 100;
            let finalMark = 0;
            
            if (percentage >= 90) finalMark = 10;
            else if (percentage >= 85) finalMark = 9;
            else if (percentage >= 80) finalMark = 8;
            else if (percentage >= 75) finalMark = 7;
            else if (percentage >= 70) finalMark = 6;
            else if (percentage >= 65) finalMark = 5;
            else if (percentage >= 60) finalMark = 4;
            else finalMark = 0; 
            
            markData.mark = finalMark;
            markData.raw = { total, attended, percentage }; 
        }
      } 
      // ALGORITHM 2: Dynamic CT Formatting
      else if (segment.includes("Class Tests")) {
        if (row["CT-1"] !== undefined) markData.ct1 = Number(row["CT-1"]) || 0;
        if (row["CT-2"] !== undefined) markData.ct2 = Number(row["CT-2"]) || 0;
        if (row["CT-3"] !== undefined) markData.ct3 = Number(row["CT-3"]) || 0;
        if (row["CT-4"] !== undefined) markData.ct4 = Number(row["CT-4"]) || 0;
      } 
      // ALGORITHM 3: Direct Marks
      else {
        markData.mark = Number(row["Marks"]) || 0;
      }

      processedMarks.push(markData);
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    // --- TABULATION LOCKOUT ENFORCEMENT ---
    const slot = await db.collection("routine_slots").findOne({ series: Number(series), courseCode });
    if (slot) {
       const draft = await db.collection("draft_results").findOne({ series: Number(series), semester: slot.semester });
       if (draft) {
           return NextResponse.json({ 
              error: "Tabulation Lockout: The Course Advisor is currently compiling a draft. Uploads are strictly locked." 
           }, { status: 403 });
       }
    }

    // Save the marks to the master marks collection
    await db.collection("course_marks").updateOne(
      { courseCode, series: Number(series), segment, teacherEmail: session.user.email },
      { 
        $set: {
          marks: processedMarks,
          uploadedAt: new Date(),
          teacherName: session.user.name,
          isBacklog // Mark this specific upload block as a backlog submission
        } 
      },
      { upsert: true }
    );

    // --- NEW: Update the correct completion array for the UI checkmarks ---
    const updateField = isBacklog ? "completedBacklogSegments" : "completedSegments";
    await db.collection("routine_slots").updateOne(
       { series: Number(series), courseCode },
       { $addToSet: { [updateField]: segment } }
    );

    await logSystemAction(
      "Marks Uploaded", 
      "Audit", 
      `${session.user.name} uploaded ${isBacklog ? 'BACKLOG ' : ''}${segment} marks for ${courseCode} (Series ${series})`
    );

    return NextResponse.json({ message: "Marks successfully processed and saved." });
  } catch (error: any) {
    console.error("Marks Upload Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse and save marks" }, { status: 500 });
  }
}