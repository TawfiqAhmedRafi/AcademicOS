import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 60000 });
await client.connect();
const db = client.db("academicos");

console.log("=== 1. Recent Notifications in DB ===");
const notifs = await db.collection("notifications").find().sort({ createdAt: -1 }).limit(10).toArray();
console.log(JSON.stringify(notifs, null, 2));

console.log("\n=== 2. Series 22 Config in DB ===");
const s22 = await db.collection("series").findOne({ series: { $in: [22, "22"] } });
console.log(JSON.stringify(s22, null, 2));

if (s22) {
  const advisorEmails = [s22.advisor1?.email, s22.advisor2?.email].filter(Boolean);
  console.log("\n=== 3. Series 22 Advisor User Records ===");
  const advs = await db.collection("users").find({ email: { $in: advisorEmails } }).toArray();
  console.log(JSON.stringify(advs, null, 2));
}

console.log("\n=== 4. Student 2204040 Record ===");
const student = await db.collection("users").findOne({
  $or: [{ email: /2204040/ }, { student_id: "2204040" }]
});
console.log(JSON.stringify(student, null, 2));

await client.close();

