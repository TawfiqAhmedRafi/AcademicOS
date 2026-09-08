import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { logSystemAction } from "@/lib/logger";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    const pendingDrafts = await db.collection("draft_results").find({ status: "pending_head_approval" }).sort({ submittedAt: -1 }).toArray();
    return NextResponse.json({ drafts: pendingDrafts });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "dept_head") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  try {
    const { draftId, action } = await req.json();
    const client = await clientPromise;
    const db = client.db("academicos");

    if (action === "publish") {
      const draft = await db.collection("draft_results").findOne({ _id: new ObjectId(draftId) });
      if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

      // Fetch students to check if they have a frozen history block
      const studentIds = draft.results.map((r: any) => new ObjectId(r.studentId));
      const students = await db.collection("users").find({ _id: { $in: studentIds } }).toArray();

      const bulkOps = draft.results.flatMap((res: any) => {
        const student = students.find(s => s._id.toString() === res.studentId);
        const passedCourses = res.courseGrades.filter((c: any) => c.gradePoint > 0).map((c: any) => c.courseCode);
        const failedCourses = res.failedCourses || [];
        const ops = [];

        // Check if the student has a frozen block for this semester (Stage 1 was executed)
        const hasFrozenHistory = student?.academicHistory?.some((h: any) => h.semester === draft.semester && h.resultStatus === "pending");

        if (hasFrozenHistory) {
          // --- STAGE 2 INJECTION (They were already promoted) ---
          ops.push({
            updateOne: {
              filter: { _id: new ObjectId(res.studentId), "academicHistory.semester": draft.semester },
              update: {
                $set: {
                  "academicHistory.$.publishedAt": new Date(),
                  "academicHistory.$.semesterGpa": res.semesterGpa,
                  "academicHistory.$.earnedCredits": res.earnedCredits,
                  "academicHistory.$.courses": [...res.courseGrades, ...(res.backlogGrades || [])], // Overwrites raw IDs
                  "academicHistory.$.resultStatus": "published",
                  cgpa: res.cgpa
                },
                $pull: { activeBacklogs: { $in: passedCourses } }
              }
            }
          });
        } else {
          // --- STANDARD PUSH (They haven't been promoted yet) ---
          ops.push({
            updateOne: {
              filter: { _id: new ObjectId(res.studentId) },
              update: {
                $push: {
                  academicHistory: {
                    semester: draft.semester,
                    publishedAt: new Date(),
                    semesterGpa: res.semesterGpa,
                    earnedCredits: res.earnedCredits,
                    courses: [...res.courseGrades, ...(res.backlogGrades || [])],
                    resultStatus: "published"
                  }
                },
                $set: {
                  cgpa: res.cgpa,
                  registrationStatus: "unregistered",
                  formFillupStatus: "unregistered",
                  registeredCourses: [],
                  backlogRegStatus: "unregistered",
                  registeredBacklogs: []
                },
                $pull: { activeBacklogs: { $in: passedCourses } }
              }
            }
          });
        }

        // Add to active backlogs if they failed any
        if (failedCourses.length > 0) {
          ops.push({
            updateOne: {
              filter: { _id: new ObjectId(res.studentId) },
              update: { $addToSet: { activeBacklogs: { $each: failedCourses } } }
            }
          });
        }
        return ops;
      });

      await db.collection("users").bulkWrite(bulkOps);
      await db.collection("draft_results").updateOne(
        { _id: new ObjectId(draftId) },
        { $set: { status: "published", publishedAt: new Date(), publishedBy: session.user.email } }
      );

      await logSystemAction("Results Published", "Audit", `Department Head published Semester ${draft.semester} results for Series ${draft.series}.`);
      return NextResponse.json({ message: "Results officially published and synced." });
    }

    if (action === "reject") {
      await db.collection("draft_results").updateOne({ _id: new ObjectId(draftId) }, { $set: { status: "draft" } });
      return NextResponse.json({ message: "Draft rejected and returned to Advisor." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}