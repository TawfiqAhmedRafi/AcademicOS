import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.advising_series) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const series = searchParams.get("series");

  if (!series) {
    return NextResponse.json({ error: "Missing series" }, { status: 400 });
  }

  const seriesArray = session.user.advising_series.split(",").map((s) => s.trim());
  if (!seriesArray.includes(series)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    const count2200 = await db.collection("matchitems").countDocuments({ series, course: "ETE2200", type: "project" });
    const count3200 = await db.collection("matchitems").countDocuments({ series, course: "ETE3200", type: "project" });
    const countThesis = await db.collection("matchitems").countDocuments({ series, type: "thesis" });

    return NextResponse.json({
      "2200": count2200 > 0,
      "3200": count3200 > 0,
      "thesis": countThesis > 0
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
