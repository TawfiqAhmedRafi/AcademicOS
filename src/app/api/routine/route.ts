import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

// GET: Fetches the active routine for all series, perfectly matched to their current semester
export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // 1. Fetch all active series
    const activeSeries = await db.collection("series").find({ status: "active" }).toArray();
    
    // 2. Build dynamic query: Match routine_slots where (series == X AND semester == X.currentSemester)
    const orConditions = activeSeries.map(s => ({
      series: Number(s.series), // Convert string to number to match routine_slots schema
      semester: s.currentSemester
    }));

    if (orConditions.length === 0) {
      return NextResponse.json({ seriesConfigs: [], slots: [] });
    }

    // 3. Fetch ONLY the slots that match the current active semesters
    const activeSlots = await db.collection("routine_slots").find({
      $or: orConditions
    }).toArray();

    return NextResponse.json({ seriesConfigs: activeSeries, slots: activeSlots });
  } catch (error) {
    console.error("Routine fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch routine" }, { status: 500 });
  }
}

// POST: Create a new slot
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const data = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    const newSlot = {
      ...data,
      series: Number(data.series),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("routine_slots").insertOne(newSlot);
    await logSystemAction("Routine Slot Created", "System", `Slot added for ${data.courseCode}`);
    return NextResponse.json({ message: "Slot created" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create slot" }, { status: 500 });
  }
}

// DELETE: Remove a slot
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const client = await clientPromise;
    await client.db("academicos").collection("routine_slots").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ message: "Slot deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete slot" }, { status: 500 });
  }
}
// PUT: Update an existing slot
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const data = await req.json();
    const { _id, ...updateData } = data;
    
    const client = await clientPromise;
    const db = client.db("academicos");

    await db.collection("routine_slots").updateOne(
      { _id: new ObjectId(_id) },
      { $set: { ...updateData, series: Number(updateData.series), updatedAt: new Date() } }
    );

    await logSystemAction("Routine Slot Updated", "System", `Slot updated for ${updateData.courseCode}`);
    return NextResponse.json({ message: "Slot updated" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
  }
}