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

    const pendingDrafts = await db.collection("draft_results").find({ 
      status: "pending_head_approval" 
    }).sort({ submittedAt: -1 }).toArray();

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

  // 1. Build the massive BulkWrite array for all students in this series
      // Use flatMap to allow multiple update operations per student
      const bulkOps = draft.results.flatMap((res: any) => {
        // Separate passed courses from failed courses to manage backlogs dynamically
        const passedCourses = res.courseGrades.filter((c: any) => c.gradePoint > 0).map((c: any) => c.courseCode);
        const failedCourses = res.failedCourses || [];

        const ops = [];

        // Operation A: Push history, update CGPA, reset statuses, and PULL passed backlogs
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
                  courses: [...res.courseGrades, ...(res.backlogGrades || [])]
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
              $pull: {
                activeBacklogs: { $in: passedCourses } 
              }
            }
          }
        });

        // Operation B: ADD new failed courses to active backlogs (only if they failed any)
        if (failedCourses.length > 0) {
          ops.push({
            updateOne: {
              filter: { _id: new ObjectId(res.studentId) },
              update: {
                $addToSet: {
                  activeBacklogs: { $each: failedCourses }
                }
              }
            }
          });
        }

        return ops;
      });

      // 2. Execute the Bulk Write
      await db.collection("users").bulkWrite(bulkOps);

      // 3. Mark the draft as permanently published
      await db.collection("draft_results").updateOne(
        { _id: new ObjectId(draftId) },
        { $set: { status: "published", publishedAt: new Date(), publishedBy: session.user.email } }
      );

      await logSystemAction(
        "Results Published", 
        "Audit", 
        `Department Head published Semester ${draft.semester} results for Series ${draft.series}.`
      );

      return NextResponse.json({ message: "Results officially published and synced to student profiles." });
    }

    if (action === "reject") {
      // Send it back to the Advisor's Tabulation Engine
      await db.collection("draft_results").updateOne(
        { _id: new ObjectId(draftId) },
        { $set: { status: "draft" }, $unset: { submittedAt: "" } }
      );
      return NextResponse.json({ message: "Draft rejected and returned to Course Advisor." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Publishing Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}