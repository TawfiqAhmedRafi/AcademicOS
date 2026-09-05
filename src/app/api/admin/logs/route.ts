import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

const checkIsAdmin = (session: any) => session?.user?.role === "admin" || session?.user?.isAdmin;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!checkIsAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
          
    // Fetch the 100 most recent logs
    const logs = await db.collection("system_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}