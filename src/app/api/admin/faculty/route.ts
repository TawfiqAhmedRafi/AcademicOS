import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

// Academic Rank weights for sorting (Lower number = higher in the list)
const rankWeights: Record<string, number> = {
  "Professor": 1,
  "Associate Professor": 2,
  "Assistant Professor": 3,
  "Lecturer": 4,
};

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    
    const faculties = await db.collection("users")
      .find({ role: { $in: ["faculty", "advisor", "dept_head"] } })
      .project({ password_hash: 0 }) 
      .toArray();

    // Sort: Dept Head first, then by Academic Rank
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
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { name, email, designation } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

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
    };

    await db.collection("users").insertOne(newUser);
    return NextResponse.json({ message: "Faculty added successfully", tempPassword }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add faculty" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { action, userId, newRole, newDesignation } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    if (action === "promote_head") {
      // Demote current head back to standard faculty (we don't know if they were an advisor, so default to faculty)
      await db.collection("users").updateOne(
        { role: "dept_head" },
        { $set: { role: "faculty" } }
      );
      // Promote new head
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: newRole } }
      );
      return NextResponse.json({ message: "Department Head updated" });
    } 
    
    if (action === "update_designation") {
      // Progressive Rank Upgrade
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { designation: newDesignation } }
      );
      return NextResponse.json({ message: "Designation updated successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update record" }, { status: 500 });
  }
}