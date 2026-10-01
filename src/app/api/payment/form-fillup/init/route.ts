import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const store_id = process.env.SSLCOMMERZ_STORE_ID!;
const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD!;
const is_live = process.env.SSLCOMMERZ_IS_LIVE === "true";

// SSLCommerz API endpoint (sandbox vs live)
const SSLCOMMERZ_INIT_URL = is_live
  ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
  : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    // Fetch the student's user document
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user || !user.series) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    // Form fill-up requires approved registration
    if (user.registrationStatus !== "approved") {
      return NextResponse.json({ error: "Course registration must be approved first" }, { status: 400 });
    }

    const roll = user.studentId || user.student_id || user.email?.split("@")[0];
    const series = user.series;

    // Fetch the series config to get the current semester
    const seriesConfig = await db.collection("series").findOne({ series });
    if (!seriesConfig) {
      return NextResponse.json({ error: "Series configuration not found" }, { status: 404 });
    }

    const semester = seriesConfig.currentSemester;

    // Get registered courses to calculate total credits
    const registeredCourses = user.registeredCourses || [];
    const courseObjectIds = registeredCourses.map((id: string) => {
      try { return new ObjectId(id); } catch { return null; }
    }).filter(Boolean);

    const courses = await db.collection("courses").find({
      _id: { $in: courseObjectIds }
    }).toArray();

    const totalCredits = courses.reduce((sum: number, c: any) => sum + (c.credits || 0), 0);
    const amount = totalCredits * 20; // 20 BDT per credit

    if (amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    // Base transaction ID for uniqueness check: ETE-roll-semester-FF
    const baseTranId = `ETE-${roll}-${semester}-FF`;

    // Check if a completed transaction already exists for this combo
    const existingTx = await db.collection("transactions").findOne({
      baseTranId,
      status: "completed"
    });
    if (existingTx) {
      return NextResponse.json(
        { error: "Payment already completed for this semester's form fill-up." },
        { status: 409 }
      );
    }

    // SSLCommerz requires unique tran_id per API call, so append a short timestamp
    const tran_id = `${baseTranId}-${Date.now().toString(36)}`;

    // Do NOT write to DB here. Only pass data to SSLCommerz and save on successful return!

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Build form data for SSLCommerz API
    const formBody = new URLSearchParams({
      store_id,
      store_passwd,
      total_amount: amount.toString(),
      currency: "BDT",
      tran_id,
      success_url: `${baseUrl}/api/payment/form-fillup/success`,
      fail_url: `${baseUrl}/api/payment/form-fillup/fail`,
      cancel_url: `${baseUrl}/api/payment/form-fillup/cancel`,
      ipn_url: `${baseUrl}/api/payment/form-fillup/success`,
      shipping_method: "NO",
      product_name: `Exam Form Fill-up - Semester ${semester}`,
      product_category: "Education",
      product_profile: "non-physical-goods",
      cus_name: user.name || "Student",
      cus_email: user.email,
      cus_add1: "RUET, Rajshahi",
      cus_add2: "Rajshahi",
      cus_city: "Rajshahi",
      cus_state: "Rajshahi",
      cus_postcode: "6204",
      cus_country: "Bangladesh",
      cus_phone: user.phone || "01700000000",
      cus_fax: "N/A",
      value_a: session.user.email || "", // Pass the email through value_a to identify the user on success
    });

    // Call SSLCommerz init API directly
    const sslResponse = await fetch(SSLCOMMERZ_INIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });

    const apiResponse = await sslResponse.json();

    if (apiResponse?.GatewayPageURL) {
      return NextResponse.json({ GatewayPageURL: apiResponse.GatewayPageURL });
    } else {
      console.error("SSLCommerz init failed (form-fillup) - response:", JSON.stringify(apiResponse));
      return NextResponse.json(
        { error: apiResponse?.failedreason || "Failed to initiate payment gateway" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Form-fillup payment init error:", error?.message || error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
