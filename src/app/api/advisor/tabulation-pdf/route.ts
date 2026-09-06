import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { generateTabulationPdf } from "@/lib/pdf/tabulation-pdf";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Security: Only allow Dept Head or Assigned Advisors
  if (!session?.user?.advising_series && session?.user?.role !== "dept_head") {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const series = searchParams.get("series");
    const semester = searchParams.get("semester");

    if (!series || !semester) return new NextResponse("Missing parameters", { status: 400 });

    const client = await clientPromise;
    const db = client.db("academicos");
    
    // Fetch the draft matching the query
    const draft = await db.collection("draft_results").findOne({ series: Number(series), semester });

    if (!draft) return new NextResponse("Result sheet not found", { status: 404 });

    // Stream the generated buffer to the client
    const pdf = await generateTabulationPdf(draft);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Tabulation_Series_${series}_Sem_${semester}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Tabulation PDF generation failed:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}