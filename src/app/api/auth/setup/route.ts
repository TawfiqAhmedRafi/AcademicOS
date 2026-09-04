import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, tempPassword, newPassword, profilePhotoUrl, initials } = await req.json();

    if (!email || !tempPassword || !newPassword || !profilePhotoUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email });

    if (!user || !user.needs_setup) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    const isTempValid = await bcrypt.compare(tempPassword, user.password_hash);
    if (!isTempValid) {
      return NextResponse.json({ message: "Authentication failed" }, { status: 401 });
    }

    if (tempPassword === newPassword) {
      return NextResponse.json(
        { message: "Your new password must be different from the temporary password." }, 
        { status: 400 }
      );
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Prepare the update document
    const updateData: any = {
      password_hash: hashedNewPassword,
      profile_photo_url: profilePhotoUrl,
      needs_setup: false
    };

    // If the user is faculty, require and update the initials
    if (["faculty", "advisor", "dept_head"].includes(user.role)) {
      if (!initials) {
        return NextResponse.json({ message: "Initials are required for faculty members." }, { status: 400 });
      }
      updateData.initials = initials;
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: updateData }
    );

    return NextResponse.json({ message: "Setup complete" }, { status: 200 });

  } catch (error) {
    console.error("Setup processing error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}