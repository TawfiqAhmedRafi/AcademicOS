import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { generateCalendarPdf } from "@/lib/pdf/calendar-pdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // FIX: Check for advising_series, because their actual role is "faculty" or "dept_head"
  if (!session?.user?.advising_series) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const series = session.user.advising_series.split(",")[0].trim();
    const client = await clientPromise;
    const db = client.db("academicos");
    
    const seriesConfig = await db.collection("series").findOne({ series });
    const calendar = await db.collection("academic_calendars").findOne({ 
      series: Number(series), 
      semester: seriesConfig?.currentSemester,
      status: "published"
    });

    if (!calendar) return new NextResponse("Calendar not published", { status: 404 });

    // Scrub long strings for the PDF
    if (calendar.ctSchedule) {
      calendar.ctSchedule = calendar.ctSchedule.map((ct: any) => {
        if (ct.courseCode && ct.courseCode.includes(" / ")) {
          const firstCode = ct.courseCode.split(" / ")[0].trim();
          ct.courseCode = firstCode.length > 2 ? firstCode.slice(0, -2) + "XX" : "Electives";
        }
        return ct;
      });
    }

    const head = await db.collection("users").findOne({ role: "dept_head" });
    const pdf = await generateCalendarPdf(calendar, seriesConfig, head);

    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Academic_Calendar_Series_${series}.pdf"`,
      },
    });
  } catch (err) {
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}