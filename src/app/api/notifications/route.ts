import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { buildUserAudienceQuery } from "@/lib/notifications";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const countOnly = searchParams.get("countOnly") === "1";
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 50);
    const before = searchParams.get("before");

    const client = await clientPromise;
    const db = client.db("academicos");

    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure all series advised by this user (from series collection or user doc) are included
    if (user.role === "faculty" || user.role === "advisor" || user.role === "dept_head") {
      const advisedSeriesDocs = await db.collection("series").find({
        status: "active",
        $or: [{ "advisor1.email": user.email }, { "advisor2.email": user.email }, { advisorEmail: user.email }]
      }).project({ series: 1 }).toArray();

      const additionalSeries = advisedSeriesDocs.map((s: any) => String(s.series));
      const existingList = user.advising_series
        ? String(user.advising_series).split(",").map((s: string) => s.trim())
        : [];
      
      const mergedSeries = Array.from(new Set([...existingList, ...additionalSeries]));
      if (mergedSeries.length > 0) {
        user.advising_series = mergedSeries.join(", ");
        if (!user.role || user.role === "faculty") user.role = "advisor";
      }
    }

    const audienceQuery = buildUserAudienceQuery(user);
    const clearedAt = user.notificationsClearedAt ? new Date(user.notificationsClearedAt) : new Date(0);

    // Fetch individual read markers after clearedAt
    const reads = await db
      .collection("notification_reads")
      .find({
        userId: String(user._id),
        readAt: { $gte: clearedAt },
      })
      .project({ notificationId: 1 })
      .toArray();

    const readIdStrings = new Set(reads.map((r) => String(r.notificationId)));
    const readObjectIds = Array.from(readIdStrings).map((id) => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    }).filter(Boolean) as ObjectId[];

    // Calculate unread count (anything after clearedAt that hasn't been individually read)
    const unreadFilter: any = {
      $and: [
        audienceQuery,
        { createdAt: { $gt: clearedAt } },
        ...(readObjectIds.length > 0 ? [{ _id: { $nin: readObjectIds } }] : []),
      ],
    };

    const unreadCount = await db.collection("notifications").countDocuments(unreadFilter);

    if (countOnly) {
      return NextResponse.json({ unreadCount });
    }

    // Build query for notifications list
    const listConditions: any[] = [audienceQuery];
    if (before) {
      listConditions.push({ createdAt: { $lt: new Date(before) } });
    }
    if (unreadOnly) {
      listConditions.push({ createdAt: { $gt: clearedAt } });
      if (readObjectIds.length > 0) {
        listConditions.push({ _id: { $nin: readObjectIds } });
      }
    }

    const query = listConditions.length > 1 ? { $and: listConditions } : listConditions[0];

    const rawNotifications = await db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = rawNotifications.length > limit;
    const items = rawNotifications.slice(0, limit);

    const notifications = items.map((doc) => {
      const isRead =
        doc.createdAt <= clearedAt || readIdStrings.has(String(doc._id));
      return {
        _id: String(doc._id),
        title: doc.title,
        message: doc.message,
        category: doc.category,
        link: doc.link,
        count: doc.count || 1,
        createdAt: doc.createdAt,
        isRead,
      };
    });

    return NextResponse.json({
      notifications,
      unreadCount,
      hasMore,
    });
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, all } = body;

    const client = await clientPromise;
    const db = client.db("academicos");

    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure all series advised by this user (from series collection or user doc) are included
    if (user.role === "faculty" || user.role === "advisor" || user.role === "dept_head") {
      const advisedSeriesDocs = await db.collection("series").find({
        status: "active",
        $or: [{ "advisor1.email": user.email }, { "advisor2.email": user.email }, { advisorEmail: user.email }]
      }).project({ series: 1 }).toArray();

      const additionalSeries = advisedSeriesDocs.map((s: any) => String(s.series));
      const existingList = user.advising_series
        ? String(user.advising_series).split(",").map((s: string) => s.trim())
        : [];
      
      const mergedSeries = Array.from(new Set([...existingList, ...additionalSeries]));
      if (mergedSeries.length > 0) {
        user.advising_series = mergedSeries.join(", ");
        if (!user.role || user.role === "faculty") user.role = "advisor";
      }
    }

    if (all) {
      // Mark all as read by updating the user's notificationsClearedAt watermark
      await db.collection("users").updateOne(
        { _id: user._id },
        { $set: { notificationsClearedAt: new Date() } }
      );
      return NextResponse.json({ message: "All notifications marked as read" });
    }

    if (id) {
      // Mark single notification as read
      let notificationObjectId: ObjectId;
      try {
        notificationObjectId = new ObjectId(id);
      } catch {
        return NextResponse.json({ error: "Invalid notification ID" }, { status: 400 });
      }

      await db.collection("notification_reads").updateOne(
        {
          userId: String(user._id),
          notificationId: notificationObjectId,
        },
        {
          $set: {
            userId: String(user._id),
            notificationId: notificationObjectId,
            readAt: new Date(),
          },
        },
        { upsert: true }
      );

      return NextResponse.json({ message: "Notification marked as read" });
    }

    return NextResponse.json({ error: "Missing id or all parameter" }, { status: 400 });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

