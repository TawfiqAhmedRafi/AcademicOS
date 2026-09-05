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
    
    // FIX: Safely extract and trim the segment to guarantee exact string matching
    const rawSegment = searchParams.get("segment") || "";
    const segment = rawSegment.trim();

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

    const students = await db.collection("users").find({
      role: "student",
      series: String(series),
      registrationStatus: "approved"
    }).toArray();

    const enrolledStudents = students.filter(s => 
      s.registeredCourses && s.registeredCourses.includes(courseIdStr)
    );

    const rolls = enrolledStudents
      .map(s => s.studentId || s.email.split('@')[0])
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    // FIX: Bulletproof header mapping for CTs
    let headers: string[] = [];
    if (segment === "Attendance") {
      headers = ["Roll Number", "Total Classes", "Attended Classes"];
    } else if (segment === "Class Tests (4)") {
      headers = ["Roll Number", "CT-1", "CT-2", "CT-3", "CT-4"]; // 4 columns for single teacher
    } else if (segment === "Class Tests (2)") {
      headers = ["Roll Number", "CT-1", "CT-2"]; // 2 columns for multi-teacher
    } else {
      headers = ["Roll Number", "Marks"];
    }

    const excelData = rolls.map(roll => {
      const row: any = { "Roll Number": roll };
      headers.slice(1).forEach(h => row[h] = "");
      return row;
    });

    if (excelData.length === 0) {
       const dummyRow: any = { "Roll Number": "No approved students yet" };
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
    const filename = `${courseCode.replace(/\s+/g, "_")}_${series}_${sanitizedSegment}.xlsx`;

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