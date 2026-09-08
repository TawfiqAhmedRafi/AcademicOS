import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!["dept_head", "admin", "advisor", "faculty"].includes(session?.user?.role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    const series = await db.collection("series").find({ status: "active" }).sort({ series: -1 }).toArray();
    return NextResponse.json(series);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch series" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  // ... [Keep your exact existing POST function for Excel Upload here] ...
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const formData = await req.formData();
    const series = formData.get("series") as string;
    const currentSemester = formData.get("currentSemester") as string;
    const file = formData.get("file") as File;

    if (!series || !currentSemester || !file) {
      return NextResponse.json({ error: "Missing required fields or Excel file." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    const existing = await db.collection("series").findOne({ series });
    if (existing) return NextResponse.json({ error: "Series already exists" }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const studentsToInsert = [];

    for (const row of data as any[]) {
      const roll = row["Roll"] || row["Roll Number"] || row["Student ID"];
      const name = row["Name"] || row["Student Name"];
      const regNo = row["Registration Number"] || row["Reg No"]; 

      if (!roll || !name) continue; 

      const email = `${roll}@student.ruet.ac.bd`;
      const password_hash = await bcrypt.hash(email, 12); 

      studentsToInsert.push({
        name: String(name).trim(),
        email: email.trim(),
        studentId: String(roll).trim(),
        student_id: String(roll).trim(), 
        regNo: regNo ? String(regNo).trim() : undefined,
        series: series,
        password_hash,
        role: "student",
        department: "ETE",
        needs_setup: true, 
        loginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

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

    if (studentsToInsert.length > 0) {
      await db.collection("users").insertMany(studentsToInsert);
    }

    await logSystemAction("Series Created", "System", `Series ${series} initialized with ${studentsToInsert.length} students`);
    return NextResponse.json({ message: `Series created and ${studentsToInsert.length} students provisioned successfully.` }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create series" }, { status: 500 });
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
      const seriesDoc = await db.collection("series").findOne({ _id: new ObjectId(seriesId) });
      const oldSemester = seriesDoc?.currentSemester;

      if (oldSemester) {
        const students = await db.collection("users").find({ role: "student", series: seriesDoc.series }).toArray();
        if (students.length > 0) {
          const bulkOps = students.map(student => {
            const updateDoc: any = {
              $set: {
                registrationStatus: "unregistered",
                formFillupStatus: "unregistered",
                registeredCourses: [],
                backlogRegStatus: "unregistered",
                registeredBacklogs: []
              }
            };

            // --- DOUBLE ARCHIVE FIX & STAGE 1 FREEZE ---
            if (student.registeredCourses && student.registeredCourses.length > 0) {
              updateDoc.$push = {
                academicHistory: {
                  semester: oldSemester,
                  courses: student.registeredCourses, // Raw IDs safely frozen
                  backlogs: student.registeredBacklogs || [], // Backlogs frozen
                  registrationStatus: student.registrationStatus || "unregistered",
                  formFillupStatus: student.formFillupStatus || "unregistered",
                  backlogRegStatus: student.backlogRegStatus || "unregistered",
                  archivedAt: new Date(),
                  resultStatus: "pending" // Signals results aren't out yet
                }
              };
            }

            return { updateOne: { filter: { _id: student._id }, update: updateDoc } };
          });
          
          await db.collection("users").bulkWrite(bulkOps);
        }
      }

      await db.collection("series").updateOne(
        { _id: new ObjectId(seriesId) },
        { $set: { 
             currentSemester: payload.newSemester, 
             "registration.isOpen": false,
            "formFillup.isOpen": false,
            "backlogRegistration.isOpen": false,
            updatedAt: new Date() 
           } 
         }
      );
      await logSystemAction("Semester Promoted", "System", `Series ${seriesDoc?.series} advanced from ${oldSemester} to ${payload.newSemester}`);
      return NextResponse.json({ message: "Semester updated and records safely frozen." });
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
        { $set: { [updateFieldEmail]: advisorEmail, [updateFieldName]: advisorName, updatedAt: new Date() } }
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