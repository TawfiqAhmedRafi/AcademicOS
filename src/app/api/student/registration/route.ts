import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // 1. Get the logged-in student's document
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user || !user.series) return NextResponse.json({ error: "Student series not found" }, { status: 404 });

    // 2. Get the global config for their series (to check if open, and what semester it is)
    const seriesConfig = await db.collection("series").findOne({ series: user.series });
    if (!seriesConfig) return NextResponse.json({ error: "Series configuration not found" }, { status: 404 });

    // 3. Fetch the curriculum for their specific active semester
    const courses = await db.collection("courses").find({ 
      $or: [
        { semester: seriesConfig.currentSemester },
        { level: seriesConfig.currentSemester } // Fallback for legacy schemas
      ]
    }).sort({ courseCode: 1 }).toArray();

    return NextResponse.json({
      status: user.registrationStatus || "unregistered",
      registeredCourses: user.registeredCourses || [],
      seriesConfig,
      courses
    });
  } catch (error) {
    console.error("Student Registration Fetch Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "student") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { selectedCourseIds } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    // Update the student's status to "pending" so it shows up in the Advisor's queue
    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { 
          registrationStatus: "pending", 
          registeredCourses: selectedCourseIds,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ message: "Registration submitted successfully to Advisor." });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}