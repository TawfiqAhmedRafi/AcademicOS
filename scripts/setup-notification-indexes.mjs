import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not defined in .env");

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 30000 });

async function setup() {
  try {
    await client.connect();
    const db = client.db("academicos");

    console.log("Setting up notification indexes...");

    // 1. Notifications collection
    const notifs = db.collection("notifications");
    await notifs.createIndex({ createdAt: -1 });
    await notifs.createIndex({ "audience.roles": 1, "audience.series": 1 });
    await notifs.createIndex({ "audience.userIds": 1 });
    await notifs.createIndex({ dedupeKey: 1 });

    // Optional 90-day TTL cleanup
    try {
      await notifs.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: 90 * 24 * 60 * 60, name: "ttl_90_days" }
      );
    } catch {
      // Ignore if index with different options already exists
    }

    // 2. Notification reads collection
    const reads = db.collection("notification_reads");
    await reads.createIndex({ userId: 1, notificationId: 1 }, { unique: true });
    await reads.createIndex({ userId: 1, readAt: -1 });

    console.log("Notification indexes configured successfully!");
  } finally {
    await client.close();
  }
}

setup().catch(console.error);

