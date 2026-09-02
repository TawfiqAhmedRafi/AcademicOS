import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, tempPassword, newPassword, profilePhotoUrl } = await req.json();

    if (!email || !tempPassword || !newPassword || !profilePhotoUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");
    const user = await db.collection("users").findOne({ email });

    if (!user || !user.needs_setup) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

// Verify the temporary password one last time for security
    const isTempValid = await bcrypt.compare(tempPassword, user.password_hash);
    if (!isTempValid) {
      return NextResponse.json({ message: "Authentication failed" }, { status: 401 });
    }

    // NEW SECURITY CHECK: Prevent reusing the temporary password
    if (tempPassword === newPassword) {
      return NextResponse.json(
        { message: "Your new password must be different from the temporary password." }, 
        { status: 400 }
      );
    }

    // Hash the new, secure password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Finalize the account setup in MongoDB
    await db.collection("users").updateOne(
      { _id: user._id },
      { 
        $set: { 
          password_hash: hashedNewPassword, 
          profile_photo_url: profilePhotoUrl,
          needs_setup: false 
        } 
      }
    );

    return NextResponse.json({ message: "Setup complete" }, { status: 200 });
  } catch (error) {
    console.error("Setup processing error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}