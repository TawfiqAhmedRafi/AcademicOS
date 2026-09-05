import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

const checkIsAdmin = (session: any) => session?.user?.role === "admin" || session?.user?.isAdmin;

// Fetch all users
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!checkIsAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

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

// Unlock account or toggle admin privileges
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!checkIsAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { userId, action } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    const targetUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
    const targetName = targetUser?.name || "Unknown User";
    
    // FIX: Safely unwrap the session email for TypeScript
    const adminEmail = session?.user?.email || "System Admin";

    if (action === "unlock") {
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $unset: { lockoutUntil: "", loginAttempts: "" } }
      );
      
      // Precise Security Log
      await logSystemAction(
        "Account Unlocked", 
        "Security", 
        `Admin (${adminEmail}) manually unlocked the account for ${targetName}`
      );

      return NextResponse.json({ message: "Account unlocked successfully" });
    }

    if (action === "toggle_admin") {
      const newAdminStatus = !targetUser?.isAdmin;
      
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $set: { isAdmin: newAdminStatus } }
      );

      // Precise Audit Log
      await logSystemAction(
        "Admin Privilege Toggled", 
        "Audit", 
        `Admin (${adminEmail}) ${newAdminStatus ? "granted" : "revoked"} admin privileges for ${targetName}`
      );

      return NextResponse.json({ message: `Admin privileges ${newAdminStatus ? "granted" : "revoked"}` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

// Delete user
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!checkIsAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    
    if (id === session?.user?.id) {
      return NextResponse.json({ error: "You cannot delete your own active session account." }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");
    
    const targetUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
    const targetName = targetUser?.name || "Unknown";
    const targetEmail = targetUser?.email || "Unknown";

    await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    // FIX: Safely unwrap the session email for TypeScript
    const adminEmail = session?.user?.email || "System Admin";

    // Precise System Log for Deletion
    await logSystemAction(
      "User Deleted", 
      "Security", 
      `Admin (${adminEmail}) permanently deleted user account: ${targetName} (${targetEmail})`
    );

    return NextResponse.json({ message: "User deleted permanently" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}