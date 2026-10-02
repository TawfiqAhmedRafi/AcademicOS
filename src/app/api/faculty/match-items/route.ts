import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role || "student";
  if (role === "student") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target"); // 2200 | 3200 | thesis | all
  const series = searchParams.get("series"); // optional
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "60"), 100);
  const skip = (page - 1) * limit;

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    
    const query: any = {};
    if (target === "2200") {
        query.type = "project";
        query.course = "ETE2200";
    } else if (target === "3200") {
        query.type = "project";
        query.course = "ETE3200";
    } else if (target === "thesis") {
        query.type = "thesis";
    }

    if (series && series !== "all") {
        query.series = series;
    }

    const [items, total] = await Promise.all([
      db.collection("matchitems").find(query).sort({ series: -1, members: 1, student_id: 1, _id: 1 }).skip(skip).limit(limit).toArray(),
      db.collection("matchitems").countDocuments(query)
    ]);

    // Name Hydration
    if (items.length > 0) {
      const rollsToFetch = new Set<string>();
      
      // 1. Collect all unique missing rolls
      for (const res of items) {
        if (!res.studentName && (!res.memberNames || res.memberNames.length === 0)) {
           if (res.members && res.members.length > 0) {
              for (const roll of res.members) {
                 rollsToFetch.add(roll);
              }
           }
        }
      }

      // 2. Fetch all missing names in a single query
      const userCache = new Map<string, string>();
      if (rollsToFetch.size > 0) {
         const users = await db.collection("users").find(
            { student_id: { $in: Array.from(rollsToFetch) } },
            { projection: { student_id: 1, name: 1 } }
         ).toArray();
         
         for (const u of users) {
            userCache.set(u.student_id, u.name);
         }
      }

      // 3. Hydrate the items
      for (const res of items) {
        if (!res.studentName && (!res.memberNames || res.memberNames.length === 0)) {
           if (res.members && res.members.length > 0) {
              res.memberNames = res.members.map((roll: string) => userCache.get(roll) || "");
           }
        }
      }
    }

    return NextResponse.json({
      items,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
