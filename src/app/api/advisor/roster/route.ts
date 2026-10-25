import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { logSystemAction } from "@/lib/logger";
import { ObjectId } from "mongodb"; // <-- NEW: Properly imported ObjectId

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.advising_series && session?.user?.role !== "dept_head") {
    return NextResponse.json({ error: "Unauthorized. Not an active advisor." }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    const seriesArray = session.user.advising_series
      ? session.user.advising_series.split(",").map((s: string) => s.trim())
      : [];

    const seriesQuery = session.user.role === "dept_head" && seriesArray.length === 0
      ? {}
      : { series: { $in: seriesArray } };

    const studentsQuery = session.user.role === "dept_head" && seriesArray.length === 0
      ? { role: "student" }
      : { role: "student", series: { $in: seriesArray } };

    const seriesData = await db.collection("series")
      .find(seriesQuery)
      .toArray();

    const students = await db.collection("users")
      .find(studentsQuery)
      .project({ password_hash: 0, resetOtp: 0 }) 
      .toArray();

    // Fetch courses so the frontend can resolve IDs to Course Codes
    const courses = await db.collection("courses")
      .find({})
      .project({ courseCode: 1, title: 1 })
      .toArray();

    return NextResponse.json({ seriesData, students, courses });
  } catch (error) {
    console.error("Advisor Roster Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch roster data" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.advising_series && session?.user?.role !== "dept_head") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { series, action, payload } = await req.json();
    
    const seriesArray = session.user.advising_series ? session.user.advising_series.split(",").map((s: string) => s.trim()) : [];
    if (!seriesArray.includes(String(series)) && session.user.role !== "dept_head") {
      return NextResponse.json({ error: "Forbidden. You do not advise this series." }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");
    
    

    // --- TOGGLES & DEADLINES ---
    if (action === "toggle_registration") {
      await db.collection("series").updateOne({ series }, { $set: { "registration.isOpen": payload.isOpen, updatedAt: new Date() } });
      await logSystemAction("Registration Toggled", "System", `Registration for Series ${series} is now ${payload.isOpen ? 'OPEN' : 'CLOSED'}`);
      return NextResponse.json({ message: "Registration status updated" });
    }

    if (action === "set_deadline") {
      await db.collection("series").updateOne({ series }, { $set: { "registration.deadline": payload.deadline, updatedAt: new Date() } });
      return NextResponse.json({ message: "Deadline updated" });
    }

    if (action === "toggle_form_fillup") {
      await db.collection("series").updateOne({ series }, { $set: { "formFillup.isOpen": payload.isOpen, updatedAt: new Date() } });
      await logSystemAction("Form Fillup Toggled", "System", `Form Fill-up for Series ${series} is now ${payload.isOpen ? 'OPEN' : 'CLOSED'}`);
      return NextResponse.json({ message: "Form Fill-up status updated" });
    }

    if (action === "set_form_fillup_deadline") {
      await db.collection("series").updateOne({ series }, { $set: { "formFillup.deadline": payload.deadline, updatedAt: new Date() } });
      return NextResponse.json({ message: "Deadline updated" });
    }

    if (action === "toggle_backlog_registration") {
      await db.collection("series").updateOne({ series }, { $set: { "backlogRegistration.isOpen": payload.isOpen, updatedAt: new Date() } });
      await logSystemAction("Backlog Reg Toggled", "System", `Backlog Registration for Series ${series} is now ${payload.isOpen ? 'OPEN' : 'CLOSED'}`);
      return NextResponse.json({ message: "Backlog Registration status updated" });
    }

    if (action === "set_backlog_deadline") {
      await db.collection("series").updateOne({ series }, { $set: { "backlogRegistration.deadline": payload.deadline, updatedAt: new Date() } });
      return NextResponse.json({ message: "Backlog Deadline updated" });
    }
    // --- BULK APPROVALS ---
    if (action === "bulk_approve_reg") {
      await db.collection("users").updateMany(
        { series, role: "student", registrationStatus: "pending" },
        { $set: { registrationStatus: "approved", updatedAt: new Date() } }
      );
      await logSystemAction("Bulk Approval", "Audit", `Course Registrations bulk approved for Series ${series}`);
      return NextResponse.json({ message: "All pending registrations approved." });
    }

    if (action === "bulk_approve_ff") {
      await db.collection("users").updateMany(
        { series, role: "student", formFillupStatus: "pending" },
        { $set: { formFillupStatus: "approved", updatedAt: new Date() } }
      );
      await logSystemAction("Bulk Approval", "Audit", `Form Fill-ups bulk approved for Series ${series}`);
      return NextResponse.json({ message: "All pending form fill-ups approved." });
    }

    // --- INDIVIDUAL APPROVALS (For the Approvals Page) ---
    if (action === "approve_individual_reg" || action === "reject_individual_reg") {
      const newStatus = action === "approve_individual_reg" ? "approved" : "unregistered"; // Rejection forces them to resubmit
      
      // FIXED: Properly cast the ID using the imported ObjectId
      await db.collection("users").updateOne(
        { _id: new ObjectId(payload.studentId) },
        { $set: { registrationStatus: newStatus, updatedAt: new Date() } }
      );
      return NextResponse.json({ message: `Registration ${newStatus}` });
    }

    if (action === "approve_individual_ff" || action === "reject_individual_ff") {
      const newStatus = action === "approve_individual_ff" ? "approved" : "unregistered";
      
      // FIXED: Properly cast the ID using the imported ObjectId
      await db.collection("users").updateOne(
        { _id: new ObjectId(payload.studentId) },
        { $set: { formFillupStatus: newStatus, updatedAt: new Date() } }
      );
      return NextResponse.json({ message: `Form Fill-up ${newStatus}` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Advisor Roster Patch Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}