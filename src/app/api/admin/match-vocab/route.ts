import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { logSystemAction } from "@/lib/logger";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin && session?.user?.role !== "admin" && session?.user?.role !== "dept_head") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const vocab = await db.collection("matchvocab").find().sort({ createdAt: -1 }).toArray();
  return NextResponse.json(vocab);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin && session?.user?.role !== "admin" && session?.user?.role !== "dept_head") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const body = await req.json();
  const { action, item } = body;

  if (action === "create" || action === "update") {
    const { kind, from, to, enabled } = item;
    
    // Validation
    if (!["synonym", "phrase", "stopword"].includes(kind)) return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    if (!from || from.trim() === "") return NextResponse.json({ error: "'from' is required" }, { status: 400 });
    
    const cleanFrom = from.toLowerCase().trim();
    const cleanTo = to ? to.toLowerCase().trim() : "";

    if (kind === "synonym") {
      if (!cleanTo || cleanTo.includes(" ")) return NextResponse.json({ error: "Synonym 'to' must be a single token" }, { status: 400 });
      if (cleanFrom === cleanTo) return NextResponse.json({ error: "Cycle detected (from == to)" }, { status: 400 });
    } else if (kind === "stopword") {
      if (cleanTo) return NextResponse.json({ error: "Stopwords do not have a 'to' field" }, { status: 400 });
    }

    const doc = {
      kind,
      from: cleanFrom,
      to: cleanTo,
      enabled: enabled !== false,
      updatedAt: new Date(),
    };

    let resultId = item._id;

    if (action === "create") {
      const existing = await db.collection("matchvocab").findOne({ kind, from: cleanFrom });
      if (existing) return NextResponse.json({ error: "Rule already exists" }, { status: 400 });
      
      const res = await db.collection("matchvocab").insertOne({
        ...doc,
        createdBy: session.user.id,
        createdAt: new Date(),
      });
      resultId = res.insertedId;
      logSystemAction(`Create Vocab`, "System", `Kind: ${kind}, From: ${cleanFrom}, By: ${session.user.id}`);
    } else {
      await db.collection("matchvocab").updateOne({ _id: new ObjectId(item._id) }, { $set: doc });
      logSystemAction(`Update Vocab`, "System", `ID: ${item._id}, By: ${session.user.id}`);
    }
    
    return NextResponse.json({ ok: true, id: resultId });
  }

  if (action === "delete") {
    await db.collection("matchvocab").deleteOne({ _id: new ObjectId(item._id) });
    logSystemAction(`Delete Vocab`, "System", `ID: ${item._id}, By: ${session.user.id}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
