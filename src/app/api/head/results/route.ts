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

      const studentIds = draft.results.map((r: any) => new ObjectId(r.studentId));
      const students = await db.collection("users").find({ _id: { $in: studentIds } }).toArray();

      const bulkOps = draft.results.flatMap((res: any) => {
        const student = students.find(s => s._id.toString() === res.studentId);

        // Target passed backlogs to remove them from the active flags
        const passedCourses = res.isBacklogDraft
          ? res.backlogGrades.filter((c: any) => c.gradePoint > 0).map((c: any) => c.courseCode)
          : res.courseGrades.filter((c: any) => c.gradePoint > 0).map((c: any) => c.courseCode);

        const failedCourses = res.failedCourses || [];
        const ops = [];

        // --- BACKLOG RESULT INJECTION ---
        if (draft.isBacklogDraft) {
          ops.push({
            updateOne: {
              filter: { _id: new ObjectId(res.studentId) },
              update: {
                $push: {
                  academicHistory: {
                    semester: draft.semester, // This will say "Backlogs_4-1"
                    publishedAt: new Date(),
                    courses: res.backlogGrades,
                    resultStatus: "published"
                  }
                },
                $set: {
                  cgpa: res.cgpa,
                  backlogRegStatus: "unregistered",
                  registeredBacklogs: []
                },
                $pull: { activeBacklogs: { $in: passedCourses } }
              }
            }
          });
        }
        // --- REGULAR SEMESTER INJECTION ---
        else {
          const hasFrozenHistory = student?.academicHistory?.some((h: any) => h.semester === draft.semester && h.resultStatus === "pending");

          if (hasFrozenHistory) {
            ops.push({
              updateOne: {
                filter: { _id: new ObjectId(res.studentId), "academicHistory.semester": draft.semester },
                update: {
                  $set: {
                    "academicHistory.$.publishedAt": new Date(),
                    "academicHistory.$.semesterGpa": res.semesterGpa,
                    "academicHistory.$.earnedCredits": res.earnedCredits,
                    "academicHistory.$.courses": res.courseGrades,
                    "academicHistory.$.resultStatus": "published",
                    cgpa: res.cgpa
                  },
                  $pull: { activeBacklogs: { $in: passedCourses } }
                }
              }
            });
          } else {
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
                      courses: res.courseGrades,
                      resultStatus: "published"
                    }
                  },
                  $set: {
                    cgpa: res.cgpa,
                    registrationStatus: "unregistered",
                    formFillupStatus: "unregistered",
                    registeredCourses: []
                  },
                  $pull: { activeBacklogs: { $in: passedCourses } }
                }
              }
            });
          }
        }

        if (failedCourses.length > 0 && !draft.isBacklogDraft) {
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