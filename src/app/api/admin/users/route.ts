import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Fetch all users
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    const users = await db.collection("users")
      .find({})
      .project({ password_hash: 0, resetOtp: 0 }) 
      .sort({ role: 1, name: 1 })
      .toArray();

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// Unlock an account
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { userId, action } = await req.json();
    if (action !== "unlock") return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("academicos");

    // Instantly lift the lock and reset their attempt counter
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      { $unset: { lockoutUntil: "", loginAttempts: "" } }
    );

    return NextResponse.json({ message: "Account unlocked successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to unlock account" }, { status: 500 });
  }
}