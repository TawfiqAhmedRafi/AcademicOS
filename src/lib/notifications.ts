import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export interface NotificationAudience {
  roles?: string[]; // e.g. ["student", "faculty", "advisor", "dept_head", "admin"]
  series?: string[] | null; // e.g. ["22"], null or empty means all series
  userIds?: string[]; // specific user IDs as strings
}

export interface CreateNotificationParams {
  title: string;
  message: string;
  category: "notice" | "registration" | "result" | "routine" | "calendar" | "approval" | "account" | "system";
  link?: string;
  audience: NotificationAudience;
  actorId?: string; // ID of the user performing the action (excluded from audience)
  dedupeKey?: string; // If set, merges or throttles recent identical notifications (within 30m)
}

/**
 * Creates an in-app notification.
 * Safe to call from any API handler; errors are logged and will not break the caller.
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    const notifications = db.collection("notifications");

    const now = new Date();

    // Clean and normalize audience values
    const roles = params.audience.roles ? params.audience.roles.map((r) => r.toLowerCase().trim()) : [];
    const series = params.audience.series
      ? params.audience.series.map((s) => String(s).trim()).filter(Boolean)
      : null;
    const userIds = params.audience.userIds
      ? params.audience.userIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    // If dedupeKey is provided, check if a recent notification (< 30 min) exists to update it
    if (params.dedupeKey) {
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const existing = await notifications.findOne({
        dedupeKey: params.dedupeKey,
        createdAt: { $gte: thirtyMinutesAgo },
      });

      if (existing) {
        await notifications.updateOne(
          { _id: existing._id },
          {
            $set: {
              title: params.title,
              message: params.message,
              link: params.link || existing.link,
              createdAt: now, // Refresh timestamp so it counts as new/unread
              updatedAt: now,
            },
            ...(userIds.length > 0
              ? { $addToSet: { "audience.userIds": { $each: userIds } } }
              : {}),
            $inc: { count: 1 },
          }
        );
        return;
      }
    }

    const doc = {
      title: params.title,
      message: params.message,
      category: params.category,
      link: params.link || "/dashboard",
      audience: {
        roles,
        series: series && series.length > 0 ? series : null,
        userIds,
      },
      actorId: params.actorId ? String(params.actorId) : null,
      dedupeKey: params.dedupeKey || null,
      count: 1,
      createdAt: now,
    };

    await notifications.insertOne(doc);
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Resolves the query filter that matches all notifications accessible to a specific user.
 */
export function buildUserAudienceQuery(user: {
  _id?: string | ObjectId;
  role?: string;
  series?: string | number;
  advising_series?: string;
  isAdmin?: boolean;
}) {
  const userId = user._id ? String(user._id) : null;
  const userRoles: string[] = [];
  const userSeriesList: string[] = [];

  const baseRole = user.role?.toLowerCase() || "";
  if (baseRole) userRoles.push(baseRole);

  if (user.isAdmin || baseRole === "admin") {
    if (!userRoles.includes("admin")) userRoles.push("admin");
  }

  // Handle student series
  if (user.series !== undefined && user.series !== null) {
    userSeriesList.push(String(user.series).trim());
  }

  // Handle advisor role & advising series
  if (user.advising_series) {
    if (!userRoles.includes("advisor")) userRoles.push("advisor");
    const advList = String(user.advising_series)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of advList) {
      if (!userSeriesList.includes(s)) userSeriesList.push(s);
    }
  }

  // Dept head also gets faculty and advisor notifications
  if (baseRole === "dept_head") {
    if (!userRoles.includes("faculty")) userRoles.push("faculty");
    if (!userRoles.includes("advisor")) userRoles.push("advisor");
  }

  const audienceConditions: any[] = [];

  // 1. Direct user targeting
  if (userId) {
    audienceConditions.push({ "audience.userIds": userId });
  }

  // 2. Role-based targeting
  if (userRoles.length > 0) {
    // Dept Head and Admin match administrative notifications regardless of series
    if (baseRole === "dept_head" || user.isAdmin || baseRole === "admin") {
      audienceConditions.push({
        "audience.roles": { $in: ["dept_head", "admin"] },
      });
    }

    const seriesMatchConditions: any[] = [
      { "audience.series": null },
      { "audience.series": { $size: 0 } },
      { "audience.series": { $exists: false } },
    ];

    if (userSeriesList.length > 0) {
      seriesMatchConditions.push({ "audience.series": { $in: userSeriesList } });
    }

    audienceConditions.push({
      "audience.roles": { $in: userRoles },
      $or: seriesMatchConditions,
    });
  }

  const query: any = {
    $or: audienceConditions.length > 0 ? audienceConditions : [{ _id: null }],
  };

  // Exclude notifications initiated by the user themself
  if (userId) {
    query.actorId = { $ne: userId };
  }

  return query;
}

/**
 * Resolves the user IDs of the assigned advisors for a given series.
 */
export async function getSeriesAdvisorUserIds(db: any, series: string | number): Promise<string[]> {
  try {
    const seriesStr = String(series).trim();
    const seriesDoc = await db.collection("series").findOne({
      $or: [{ series: seriesStr }, { series: Number(seriesStr) }],
    });

    const advisorEmails = [
      seriesDoc?.advisor1?.email,
      seriesDoc?.advisor2?.email,
      seriesDoc?.advisorEmail,
    ].filter(Boolean);

    const advisorDocs = await db.collection("users").find({
      $or: [
        { email: { $in: advisorEmails } },
        { advising_series: { $regex: new RegExp(`(^|,)\\s*${seriesStr}\\s*(,|$)`) } },
      ],
    }).project({ _id: 1 }).toArray();

    return advisorDocs.map((doc: any) => String(doc._id));
  } catch (err) {
    console.error("Failed to get series advisor user IDs:", err);
    return [];
  }
}


