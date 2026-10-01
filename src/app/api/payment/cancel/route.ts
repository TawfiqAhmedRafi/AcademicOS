import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

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
            status: "cancelled",
            sslcommerz_response: Object.fromEntries(formData.entries()),
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=cancelled`,
      { status: 303 }
    );
  } catch (error: any) {
    console.error("Payment cancel callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/dashboard/registration?payment=cancelled`,
      { status: 303 }
    );
  }
}
