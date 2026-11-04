import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tran_id = formData.get("tran_id") as string;

    if (tran_id) {
      const client = await clientPromise;
      const db = client.db("academicos");

      await db.collection("transactions").updateOne(
        { tran_id },
        {
          $set: {
            status: "failed",
            sslcommerz_response: Object.fromEntries(formData.entries()),
            updatedAt: new Date(),
          },
        }
      );

      const tx = await db.collection("transactions").findOne({ tran_id });
      if (tx?.studentEmail) {
        const studentUser = await db.collection("users").findOne({ email: tx.studentEmail });
        if (studentUser?._id) {
          await createNotification({
            title: "Payment Unsuccessful",
            message: "Your payment transaction for course registration was not completed.",
            category: "registration",
            link: "/dashboard/registration",
            audience: { userIds: [String(studentUser._id)] },
          });
        }
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=failed`,
      { status: 303 }
    );
  } catch (error: any) {
    console.error("Payment fail callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=failed`,
      { status: 303 }
    );
  }
}
