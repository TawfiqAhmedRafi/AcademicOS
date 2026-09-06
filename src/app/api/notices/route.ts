import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // 1. Fetch Manual Notices
    const manualNotices = await db.collection("notices").find().toArray();

    // 2. Automatically Generate System Notices based on active configurations
    const activeSeries = await db.collection("series").find({ status: "active" }).toArray();
    const systemNotices: any[] = [];

    activeSeries.forEach(s => {
      if (s.registration?.isOpen) {
        systemNotices.push({
          _id: `sys_reg_${s.series}`,
          title: `Course Registration OPEN`,
          content: `Course registration for Series ${s.series} (Semester ${s.currentSemester}) is now open.` + (s.registration.deadline ? ` Hard Deadline: ${new Date(s.registration.deadline).toLocaleDateString()}` : ''),
          type: 'system',
          series: s.series,
          createdAt: s.updatedAt || new Date()
        });
      }
      if (s.formFillup?.isOpen) {
        systemNotices.push({
          _id: `sys_ff_${s.series}`,
          title: `Exam Form Fill-up OPEN`,
          content: `Semester final form fill-up for Series ${s.series} is now open.` + (s.formFillup.deadline ? ` Hard Deadline: ${new Date(s.formFillup.deadline).toLocaleDateString()}` : ''),
          type: 'system',
          series: s.series,
          createdAt: s.updatedAt || new Date()
        });
      }
      if (s.backlogRegistration?.isOpen) {
         systemNotices.push({
          _id: `sys_backlog_${s.series}`,
          title: `Backlog Registration OPEN`,
          content: `Backlog exam registration for Series ${s.series} is now open.` + (s.backlogRegistration.deadline ? ` Hard Deadline: ${new Date(s.backlogRegistration.deadline).toLocaleDateString()}` : ''),
          type: 'system',
          series: s.series,
          createdAt: s.updatedAt || new Date()
        });
      }
    });

    // 3. Automatically Generate System Notices for Published Results
    const recentResults = await db.collection("draft_results").find({ status: "published" }).sort({ publishedAt: -1 }).limit(10).toArray();
    recentResults.forEach(r => {
       systemNotices.push({
          _id: `sys_res_${r._id}`,
          title: `Official Results Published`,
          content: `The official academic results for Series ${r.series} (Semester ${r.semester}) have been formally published. Transcripts are now available.`,
          type: 'system',
          series: String(r.series),
          createdAt: r.publishedAt
       });
    });

    // Combine and sort newest first
    const allNotices = [...manualNotices, ...systemNotices].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(allNotices);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { title, content, series } = await req.json();
    if (!title || !content || !series) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("academicos");

    const newNotice = {
      title,
      content,
      series, // "all" or "22", etc.
      type: "manual",
      author: session.user.name,
      createdAt: new Date(),
    };

    await db.collection("notices").insertOne(newNotice);
    await logSystemAction("Notice Posted", "System", `Head posted notice for Series: ${series}`);

    return NextResponse.json({ message: "Notice posted successfully" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const client = await clientPromise;
    await client.db("academicos").collection("notices").deleteOne({ _id: new ObjectId(id) });
    
    return NextResponse.json({ message: "Notice deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}