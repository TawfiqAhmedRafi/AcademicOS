import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createNotification, getSeriesAdvisorUserIds } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tran_id = formData.get("tran_id") as string;
    const val_id = formData.get("val_id") as string;
    const status = formData.get("status") as string;
    const email = formData.get("value_a") as string; // We passed the email in value_a
    const amount = Number(formData.get("amount"));
    const currency = formData.get("currency") as string;

    if (!tran_id || !email) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/form-fillup?payment=failed`,
        { status: 303 }
      );
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    // Prevent double-processing
    const existingTx = await db.collection("transactions").findOne({ tran_id });
    if (existingTx && existingTx.status === "completed") {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/form-fillup?payment=success`,
        { status: 303 }
      );
    }

    // Validate with SSLCommerz (only if status is VALID or VALIDATED)
    if (status === "VALID" || status === "VALIDATED") {
      
      // Fetch user data to populate the transaction record
      const user = await db.collection("users").findOne({ email });
      if (user) {
        const roll = user.studentId || user.student_id || user.email?.split("@")[0];
        const series = user.series;
        
        const seriesConfig = await db.collection("series").findOne({ series });
        const semester = seriesConfig?.currentSemester;

        const registeredCourses = user.registeredCourses || [];
        const courseObjectIds = registeredCourses.map((id: string) => {
          try { return new ObjectId(id); } catch { return null; }
        }).filter(Boolean) as ObjectId[];

        const courses = await db.collection("courses").find({ _id: { $in: courseObjectIds } }).toArray();
        const totalCredits = courses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);

        const baseTranId = `ETE-${roll}-${semester}-FF`;

        // Insert into transactions (only the completed status is ever saved to DB!)
        await db.collection("transactions").insertOne({
          tran_id,
          baseTranId,
          roll,
          series,
          semester,
          segment: "form_fillup",
          studentEmail: email,
          amount,
          currency,
          totalCredits,
          status: "completed",
          val_id,
          sslcommerz_status: status,
          sslcommerz_response: Object.fromEntries(formData.entries()),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Now perform the actual form fill-up submission (submit to advisor)
      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            formFillupStatus: "pending",
            updatedAt: new Date(),
          },
        }
      );

      // Trigger notifications for advisor and student
      const studentUser = await db.collection("users").findOne({ email });
      if (studentUser) {
        const studentSeries = studentUser.series;
        const advisorUserIds = await getSeriesAdvisorUserIds(db, studentSeries);

        // Notify Series Advisor(s)
        await createNotification({
          title: "Form Fill-up Submitted",
          message: `${studentUser.name || studentUser.student_id || "A student"} (${studentUser.student_id || ""}) submitted semester form fill-up.`,
          category: "approval",
          link: "/dashboard/approvals",
          audience: {
            roles: ["advisor", "dept_head"],
            series: [String(studentSeries)],
            userIds: advisorUserIds,
          },
          actorId: String(studentUser._id),
          dedupeKey: `ff_sub_${studentUser.student_id || studentUser.email}`,
        });

        // Notify Student
        await createNotification({
          title: "Form Fill-up Submitted",
          message: "Your semester final form fill-up has been submitted and is pending advisor approval.",
          category: "registration",
          link: "/dashboard/form-fillup",
          audience: {
            userIds: [String(studentUser._id)],
          },
        });
      }

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/form-fillup?payment=success`,
        { status: 303 }
      );
    } else {
      // Payment was not valid - do NOT save to transactions collection!
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/form-fillup?payment=failed`,
        { status: 303 }
      );
    }
  } catch (error: any) {
    console.error("Form-fillup payment success callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/form-fillup?payment=failed`,
      { status: 303 }
    );
  }
}
