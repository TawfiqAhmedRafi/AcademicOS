import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const tran_id = formData.get("tran_id") as string;
    const val_id = formData.get("val_id") as string;
    const status = formData.get("status") as string;

    if (!tran_id) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=failed`,
        { status: 303 }
      );
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    // Fetch the transaction from DB
    const transaction = await db.collection("transactions").findOne({ tran_id });
    if (!transaction) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=failed`,
        { status: 303 }
      );
    }

    // Prevent double-processing
    if (transaction.status === "completed") {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=success`,
        { status: 303 }
      );
    }

    // Validate with SSLCommerz (only if status is VALID or VALIDATED)
    if (status === "VALID" || status === "VALIDATED") {
      // Update transaction to completed
      await db.collection("transactions").updateOne(
        { tran_id },
        {
          $set: {
            status: "completed",
            val_id,
            sslcommerz_status: status,
            sslcommerz_response: Object.fromEntries(formData.entries()),
            updatedAt: new Date(),
          },
        }
      );

      // Now perform the actual course registration (submit to advisor)
      await db.collection("users").updateOne(
        { email: transaction.studentEmail },
        {
          $set: {
            registrationStatus: "pending",
            registeredCourses: transaction.selectedCourseIds,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=success`,
        { status: 303 }
      );
    } else {
      // Payment was not valid
      await db.collection("transactions").updateOne(
        { tran_id },
        {
          $set: {
            status: "failed",
            sslcommerz_status: status,
            sslcommerz_response: Object.fromEntries(formData.entries()),
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=failed`,
        { status: 303 }
      );
    }
  } catch (error: any) {
    console.error("Payment success callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=failed`,
      { status: 303 }
    );
  }
}
