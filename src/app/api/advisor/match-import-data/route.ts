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
  const course = searchParams.get("course");
  const type = searchParams.get("type");

  if (!series || !course || !type) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  const seriesArray = session.user.advising_series.split(",").map((s) => s.trim());
  if (!seriesArray.includes(series)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    const items = await db.collection("matchitems")
      .find({ series, course, type })
      .sort({ student_id: 1 })
      .toArray();

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
