import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!["dept_head", "admin", "advisor", "faculty"].includes(session?.user?.role || "")) {
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
      // 1. Fetch the series to know what semester we are archiving
      const seriesDoc = await db.collection("series").findOne({ _id: new ObjectId(seriesId) });
      const oldSemester = seriesDoc?.currentSemester;

      if (oldSemester) {
        // 2. Fetch all students in this series
        const students = await db.collection("users").find({ role: "student", series: seriesDoc.series }).toArray();

        if (students.length > 0) {
          // 3. Prepare a Bulk Write to archive their data and reset their active state
          const bulkOps = students.map(student => ({
            updateOne: {
              filter: { _id: student._id },
              update: {
                $push: {
                  academicHistory: {
                    semester: oldSemester,
                    courses: student.registeredCourses || [],
                    registrationStatus: student.registrationStatus || "unregistered",
                    formFillupStatus: student.formFillupStatus || "unregistered",
                    archivedAt: new Date()
                  }
                },
                $set: {
                  registrationStatus: "unregistered",
                  formFillupStatus: "unregistered",
                  registeredCourses: []
                }
              }
            }
          }));
          await db.collection("users").bulkWrite(bulkOps);
        }
      }

      // 4. Update the series to the new semester and automatically lock the gates
      await db.collection("series").updateOne(
        { _id: new ObjectId(seriesId) },
        { $set: { 
            currentSemester: payload.newSemester, 
            "registration.isOpen": false,
            "formFillup.isOpen": false,
            updatedAt: new Date() 
          } 
        }
      );

      await logSystemAction("Semester Promoted", "System", `Series ${seriesDoc?.series} advanced from ${oldSemester} to ${payload.newSemester}`);
      return NextResponse.json({ message: "Semester updated and previous records archived." });
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
      const { slot, advisorEmail, advisorName } = payload; 
      
      const seriesDoc = await db.collection("series").findOne({ _id: new ObjectId(seriesId) });
      const oldEmail = slot === 1 ? seriesDoc?.advisor1?.email : seriesDoc?.advisor2?.email;
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

      const syncUserRole = async (emailToSync: string) => {
        if (!emailToSync) return;

        const userDoc = await db.collection("users").findOne({ email: emailToSync });
        if (!userDoc) return;

        const baseRole = userDoc.role === "dept_head" ? "dept_head" : "faculty";
        
        const advisedSeries = await db.collection("series").find({
          status: "active",
          $or: [{ "advisor1.email": emailToSync }, { "advisor2.email": emailToSync }]
        }).toArray();

        if (advisedSeries.length > 0) {
          const seriesList = advisedSeries.map(s => s.series).join(", ");
          await db.collection("users").updateOne(
            { email: emailToSync },
            { $set: { advising_series: seriesList, role: baseRole }, $unset: { series: "" } }
          );
        } else {
          await db.collection("users").updateOne(
            { email: emailToSync },
            { $set: { role: baseRole }, $unset: { advising_series: "", series: "" } }
          );
        }
      };

      if (oldEmail && oldEmail !== advisorEmail) await syncUserRole(oldEmail);
      if (advisorEmail) await syncUserRole(advisorEmail);
      
      await logSystemAction("Advisor Assigned", "Audit", `Assigned ${advisorName} to Series ${seriesDoc?.series}.`);
      return NextResponse.json({ message: "Advisor assigned" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update series" }, { status: 500 });
  }
}