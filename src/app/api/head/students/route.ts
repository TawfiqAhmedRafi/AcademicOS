import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head" && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // Fetch all students
    const students = await db.collection("users")
      .find({ role: "student" })
      .project({ password_hash: 0, resetOtp: 0 }) 
      .sort({ series: -1, email: 1 })
      .toArray();

    return NextResponse.json(students);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { action, studentId, newSeries, studentName } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    if (action === "year_drop") {
      // Update the student's series and wipe their active semester state 
      // so they can register cleanly with their new batch
      await db.collection("users").updateOne(
        { _id: new ObjectId(studentId) },
        { 
          $set: { 
            series: newSeries,
            registrationStatus: "unregistered",
            formFillupStatus: "unregistered",
            registeredCourses: [],
            updatedAt: new Date()
          } 
        }
      );

      await logSystemAction("Year Drop Processed", "Audit", `Student ${studentName} transferred to Series ${newSeries}`);
      return NextResponse.json({ message: "Student series updated successfully." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}