import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!["dept_head", "admin", "advisor"].includes(session?.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    
    // Fetch ONLY active series, sorted newest first
    const series = await db.collection("series")
      .find({ status: "active" })
      .sort({ series: -1 })
      .toArray();
      
    return NextResponse.json(series);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { series, currentSemester } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    const existing = await db.collection("series").findOne({ series });
    if (existing) return NextResponse.json({ error: "Series already exists" }, { status: 400 });

    const newSeries = {
      series,
      currentSemester,
      advisor1: null,
      advisor2: null,
      status: "active", 
      registration: { isOpen: false, deadline: null },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("series").insertOne(newSeries);
    await logSystemAction("Series Created", "System", `Series ${series} initialized at semester ${currentSemester}`);
    
    return NextResponse.json({ message: "Series created successfully" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create series" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { seriesId, action, payload } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    if (action === "update_semester") {
      await db.collection("series").updateOne(
        { _id: new ObjectId(seriesId) },
        { $set: { currentSemester: payload.newSemester, updatedAt: new Date() } }
      );
      await logSystemAction("Semester Promoted", "System", `Series advanced to ${payload.newSemester}`);
      return NextResponse.json({ message: "Semester updated" });
    }

    if (action === "graduate") {
      await db.collection("series").updateOne(
        { _id: new ObjectId(seriesId) },
        { $set: { status: "graduated", updatedAt: new Date() } }
      );
      await logSystemAction("Series Graduated", "System", `Series archived successfully.`);
      return NextResponse.json({ message: "Series Graduated" });
    }

    if (action === "assign_advisor") {
      const { slot, advisorEmail, advisorName } = payload; // slot is 1 or 2
      
      const updateFieldEmail = slot === 1 ? "advisor1.email" : "advisor2.email";
      const updateFieldName = slot === 1 ? "advisor1.name" : "advisor2.name";

      await db.collection("series").updateOne(
        { _id: new ObjectId(seriesId) },
        { $set: { 
            [updateFieldEmail]: advisorEmail, 
            [updateFieldName]: advisorName, 
            updatedAt: new Date() 
          } 
        }
      );

      // Upgrade the new faculty member to advisor
      if (advisorEmail) {
        await db.collection("users").updateOne(
          { email: advisorEmail, role: "faculty" },
          { $set: { role: "advisor" } }
        );
      }
      
      await logSystemAction("Advisor Assigned", "Audit", `Assigned ${advisorName} to a series.`);
      return NextResponse.json({ message: "Advisor assigned" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update series" }, { status: 500 });
  }
}