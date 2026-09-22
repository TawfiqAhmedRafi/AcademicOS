import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { imageBase64 } = await req.json(); // contains the secure cloudinary URL
    if (!imageBase64) {
      return NextResponse.json({ error: "Image URL missing." }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("academicos");

    await db.collection("users").updateOne(
      { email: session.user.email },
      { $set: { profile_photo_url: imageBase64 } }
    );

    return NextResponse.json({ message: "Profile photo updated successfully." });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile photo." }, { status: 500 });
  }
}