import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!["faculty", "advisor", "dept_head"].includes(session?.user?.role || "")) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const courseCode = searchParams.get("courseCode");
    const series = searchParams.get("series");
    
    // Safely extract and trim the segment to guarantee exact string matching
    const rawSegment = searchParams.get("segment") || "";
    const segment = rawSegment.trim();
    
    // --- NEW: Intercept Backlog Flag ---
    const isBacklog = searchParams.get("isBacklog") === "true";

    if (!courseCode || !series || !segment) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    const course = await db.collection("courses").findOne({ courseCode });
    if (!course) {
      return new NextResponse("Course not found in catalog", { status: 404 });
    }
    const courseIdStr = course._id.toString();

    // --- DYNAMIC ROSTER QUERY ---
    let query: any = { role: "student", series: String(series) };
    if (isBacklog) {
      query.backlogRegStatus = "approved"; // Only students approved for backlog exams
    } else {
      query.registrationStatus = "approved"; // Regular semester students
    }

    const students = await db.collection("users").find(query).toArray();

    // Filter down to the exact course
    const enrolledStudents = students.filter(s => {
      if (isBacklog) {
        // Backlog IDs can be stored as either string codes or ObjectIds
        return s.registeredBacklogs && (s.registeredBacklogs.includes(courseIdStr) || s.registeredBacklogs.includes(courseCode));
      } else {
        return s.registeredCourses && (s.registeredCourses.includes(courseIdStr) || s.registeredCourses.includes(courseCode));
      }
    });

    const rolls = enrolledStudents
      .map(s => s.studentId || s.email.split('@')[0])
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // Bulletproof header mapping for CTs
    let headers: string[] = [];
    if (segment === "Attendance") {
      headers = ["Roll Number", "Total Classes", "Attended Classes"];
    } else if (segment === "Class Tests (4)") {
      headers = ["Roll Number", "CT-1", "CT-2", "CT-3", "CT-4"]; 
    } else if (segment === "Class Tests (2)") {
      headers = ["Roll Number", "CT-1", "CT-2"]; 
    } else {
      headers = ["Roll Number", "Marks"];
    }

    const excelData = rolls.map(roll => {
      const row: any = { "Roll Number": roll };
      headers.slice(1).forEach(h => row[h] = "");
      return row;
    });

    if (excelData.length === 0) {
      const dummyRow: any = { "Roll Number": isBacklog ? "No approved backlog students" : "No approved students" };
      headers.slice(1).forEach(h => dummyRow[h] = "");
      excelData.push(dummyRow);
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    
    const wscols = headers.map(h => ({ wch: Math.max(15, h.length + 5) }));
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Marks_Template");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const sanitizedSegment = segment.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${courseCode.replace(/\s+/g, "_")}_${series}_${isBacklog ? 'BACKLOG_' : ''}${sanitizedSegment}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Excel Generation Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}