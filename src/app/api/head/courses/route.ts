import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const data = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    const result = await db.collection("courses").insertOne({
      courseCode: data.courseCode,
      title: data.title,
      semester: data.semester,
      credits: Number(data.credits),
      creditHours: Number(data.creditHours),
      isSessional: data.isSessional,
      isElective: data.isElective,
      isProject: data.isProject,
      pairedCourseCode: data.pairedCourseCode || null,
      syllabus: data.syllabus || "",
    });

    return NextResponse.json({ message: "Course added successfully", id: result.insertedId });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add course" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const data = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    const { _id, ...updateData } = data;

    await db.collection("courses").updateOne(
      { _id: new ObjectId(_id) },
      { $set: {
          ...updateData,
          credits: Number(updateData.credits),
          creditHours: Number(updateData.creditHours),
        } 
      }
    );

    return NextResponse.json({ message: "Course updated successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("academicos");

    await db.collection("courses").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: "Course deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}