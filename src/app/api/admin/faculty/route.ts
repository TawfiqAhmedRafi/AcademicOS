import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

const rankWeights: Record<string, number> = {
  "Professor": 1,
  "Associate Professor": 2,
  "Assistant Professor": 3,
  "Lecturer": 4,
};

const checkIsAdmin = (session: any) => session?.user?.role === "admin" || session?.user?.isAdmin;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!checkIsAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    
    const faculties = await db.collection("users")
      .find({ role: { $in: ["faculty", "advisor", "dept_head"] } })
      .project({ password_hash: 0 }) 
      .toArray();

    faculties.sort((a, b) => {
      if (a.role === "dept_head" && b.role !== "dept_head") return -1;
      if (b.role === "dept_head" && a.role !== "dept_head") return 1;
      
      const weightA = rankWeights[a.designation] || 99;
      const weightB = rankWeights[b.designation] || 99;
      return weightA - weightB;
    });

    return NextResponse.json(faculties);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch faculties" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!checkIsAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { name, email, designation } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");
    const adminEmail = session?.user?.email || "System Admin";

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) return NextResponse.json({ error: "Email already exists" }, { status: 400 });

    const tempPassword = email;
    const password_hash = await bcrypt.hash(tempPassword, 12);

    const newUser = {
      name,
      email,
      password_hash,
      role: "faculty",
      department: "ETE",
      needs_setup: true,
      loginAttempts: 0,
      createdAt: new Date(),
      designation,
      isAvailable: true, // <-- NEW: Default to true
    };

    await db.collection("users").insertOne(newUser);

    await logSystemAction(
      "New faculty account provisioned", 
      "Audit", 
      `Account created for ${email} with designation ${designation} by Admin (${adminEmail})`
    );

    return NextResponse.json({ message: "Faculty added successfully", tempPassword }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add faculty" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!checkIsAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { action, userId, newRole, newDesignation } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");
    const adminEmail = session?.user?.email || "System Admin";

    // --- NEW: Toggle Availability ---
    if (action === "toggle_availability") {
      const targetUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
      const newStatus = targetUser?.isAvailable === false ? true : false;
      
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { isAvailable: newStatus } }
      );

      await logSystemAction(
        "Faculty Availability Toggled", 
        "Audit", 
        `Admin (${adminEmail}) marked ${targetUser?.name} as ${newStatus ? 'Available' : 'On Leave'}`
      );

      return NextResponse.json({ message: `Status updated successfully` });
    }

    if (action === "promote_head") {
      await db.collection("users").updateOne(
        { role: "dept_head" },
        { $set: { role: "faculty" } }
      );

      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: newRole } }
      );

      await logSystemAction(
        "Department Head Reassigned", 
        "Audit", 
        `User ID ${userId} was promoted to Department Head by Admin (${adminEmail})`
      );

      return NextResponse.json({ message: "Department Head updated" });
    }
      
    if (action === "update_designation") {
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { designation: newDesignation } }
      );

      await logSystemAction(
        "Faculty Designation Updated", 
        "Audit", 
        `User ID ${userId} promoted to ${newDesignation} by Admin (${adminEmail})`
      );

      return NextResponse.json({ message: "Designation updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}