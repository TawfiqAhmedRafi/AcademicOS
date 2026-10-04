import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logSystemAction } from "@/lib/logger";

// Reindex rebuilds all TF-IDF/LSA indexes on the engine (~18s+); allow the function to run that long.
export const maxDuration = 60;

const MATCH_URL = process.env.MATCH_URL || "http://127.0.0.1:8001/match";
const MATCH_API_KEY = process.env.MATCH_API_KEY || "testkey";

const POLICY_MAP: Record<string, { project: boolean; thesis: boolean }> = {
  faculty: { project: true, thesis: true },
  advisor: { project: true, thesis: true },
  coordinator: { project: true, thesis: true },
  dept_head: { project: true, thesis: true },
  admin: { project: true, thesis: true },
  student: { project: false, thesis: false },
};

const rateLimits = new Map<string, { count: number; expires: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  let record = rateLimits.get(userId);
  if (!record || record.expires < now) {
    record = { count: 0, expires: now + 60000 };
    rateLimits.set(userId, record);
  }
  record.count += 1;
  return record.count <= 30;
}

const cache = new Map<string, { data: any; expires: number }>();
function getCache(key: string) {
  const record = cache.get(key);
  if (record && record.expires > Date.now()) return record.data;
  return null;
}
function setCache(key: string, data: any) {
  cache.set(key, { data, expires: Date.now() + 60000 });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") throw new Error("Timeout");
    throw error;
  }
}

async function handleProxy(req: Request, { params }: { params: { path: string[] } | Promise<{ path: string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const role = session.user.role || "student";

  if (!checkRateLimit(userId)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const resolvedParams = await params;
  const endpoint = resolvedParams.path.join("/");
  const method = req.method;
  const url = new URL(`${MATCH_URL}/${endpoint}`);
  const reqUrl = new URL(req.url);
  reqUrl.searchParams.forEach((val, key) => url.searchParams.append(key, val));

  let cacheKey = "";
  let bodyData: any = null;
  let isSearch = endpoint === "search" && method === "POST";
  let isReindex = endpoint === "reindex" && method === "POST";

  if (isReindex) {
    if (role !== "admin" && role !== "dept_head" && session.user.isAdmin !== true) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }
  }

  if (method === "POST" || method === "PUT") {
    try { bodyData = await req.json(); } catch (e) { bodyData = {}; }
  }

  const policy = POLICY_MAP[role] || POLICY_MAP.student;
  let includePeople = false;

  if (isSearch && bodyData) {
    if (!["project", "thesis"].includes(bodyData.type)) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    if (bodyData.type === "project" && !["2200", "3200"].includes(String(bodyData.course))) return NextResponse.json({ error: "Invalid course" }, { status: 400 });
    const qlen = bodyData.query?.length || 0;
    if (qlen < 2 || qlen > 4000) return NextResponse.json({ error: "Query length must be 2..4000" }, { status: 400 });
    
    includePeople = bodyData.type === "project" ? policy.project : policy.thesis;
    bodyData.includePeople = includePeople;
    logSystemAction(`Search Match`, "Audit", `Scope: ${bodyData.type} ${bodyData.course || ''}, QueryLen: ${qlen}, By: ${session.user.id}`);
  } else if (endpoint.startsWith("similar/")) {
    includePeople = policy.project || policy.thesis; 
    url.searchParams.set("includePeople", String(includePeople));
  } else if (endpoint.startsWith("cross-series")) {
    includePeople = policy.project || policy.thesis; 
    url.searchParams.set("includePeople", String(includePeople));
    cacheKey = `match:cross:${url.searchParams.get("type") || ""}:${url.searchParams.get("course") || ""}`;
  } else if (endpoint === "click" && method === "POST") {
    // 2. Click feedback
    if (!bodyData || !bodyData.logId || !bodyData.itemId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    try {
      const { getDb } = await import("@/lib/mongodb");
      const { ObjectId } = await import("mongodb");
      const db = await getDb();
      await db.collection("matchlogs").updateOne(
        { _id: new ObjectId(bodyData.logId) },
        { $push: { clicks: { itemId: bodyData.itemId, rank: bodyData.rank, ts: new Date() } } as any }
      );
      return NextResponse.json({ ok: true });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  if (!cacheKey) {
    if (method === "GET") cacheKey = `GET:${url.toString()}`;
    else if (isSearch) cacheKey = `POST:${endpoint}:${JSON.stringify(bodyData)}`;
  }

  if (cacheKey) {
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  const fetchOptions: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", "X-Internal-Key": MATCH_API_KEY },
  };

  if (bodyData) fetchOptions.body = JSON.stringify(bodyData);

  try {
    // Reindex is slow (full index rebuild); keep it under maxDuration. Everything else stays at 10s.
    const timeoutMs = isReindex ? 55000 : 10000;
    const response = await fetchWithTimeout(url.toString(), fetchOptions, timeoutMs);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid JSON from search engine" }, { status: 502 }); }
    if (!response.ok) return NextResponse.json(data, { status: response.status });
    
    // Logging (Node): matchlogs
    if (isSearch && bodyData) {
      try {
        const { getDb } = await import("@/lib/mongodb");
        const db = await getDb();
        const queryTokens = (bodyData.query || "").toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter(Boolean);
        
        const logDoc = {
          ts: new Date(),
          userRole: role,
          type: bodyData.type,
          course: bodyData.course,
          mode: bodyData.mode,
          queryTokens,
          resultCount: data.results?.length || 0,
          topScore: data.results?.[0]?.score || 0,
        };
        
        const result = await db.collection("matchlogs").insertOne(logDoc);
        data.logId = result.insertedId.toString();

        // Name Hydration
        if (includePeople && data.results && data.results.length > 0) {
          const rollsToFetch = new Set<string>();
          for (const res of data.results) {
            if (!res.studentName && (!res.memberNames || res.memberNames.length === 0)) {
               if (res.members && res.members.length > 0) {
                  for (const roll of res.members) {
                     rollsToFetch.add(roll);
                  }
               }
            }
          }

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

          for (const res of data.results) {
            if (!res.studentName && (!res.memberNames || res.memberNames.length === 0)) {
               if (res.members && res.members.length > 0) {
                  res.memberNames = res.members.map((roll: string) => userCache.get(roll) || "");
               }
            }
          }
        }
      } catch (logErr) {
        console.error("Failed to write to matchlogs or hydrate names", logErr);
      }
    }

    if (cacheKey) setCache(cacheKey, data);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === "Timeout") return NextResponse.json({ error: "Search engine is busy or down (timeout)" }, { status: 503 });
    return NextResponse.json({ error: "Search engine unreachable" }, { status: 503 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
