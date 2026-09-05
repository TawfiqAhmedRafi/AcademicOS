import { NextRequest, NextResponse } from "next/server";
import { generateRoutinePdf } from "@/lib/pdf/routine-pdf";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // 1. Fetch active series, matching slots, and all faculty in parallel for max performance
    const activeSeries = await db.collection("series").find({ status: "active" }).toArray();

    const orConditions = activeSeries.map(s => ({
      series: Number(s.series),
      semester: s.currentSemester
    }));

    const [activeSlots, facultyList] = await Promise.all([
      orConditions.length > 0
        ? db.collection("routine_slots").find({ $or: orConditions }).toArray()
        : Promise.resolve([]),
      db.collection("users")
        .find({
          role: { $in: ["faculty", "advisor", "dept_head"] },
          isAvailable: { $ne: false } // <-- NEW: Excludes "On Leave" teachers 
        })
        .project({ name: 1, initials: 1, designation: 1, role: 1 })
        .toArray()
    ]);

    // 2. Generate the PDF buffer natively on the backend
    const pdf = await generateRoutinePdf(activeSeries, activeSlots, facultyList);

    // 3. Stream it to the client
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ETE_Master_Routine.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Routine PDF generation failed:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}