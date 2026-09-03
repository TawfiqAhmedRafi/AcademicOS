import clientPromise from "@/lib/mongodb";

export async function logSystemAction(
  action: string, 
  type: "Security" | "System" | "Audit" | "Service", 
  details?: string
) {
  try {
    const client = await clientPromise;
    const db = client.db("academicos");
    await db.collection("system_logs").insertOne({
      action,
      type,
      details: details || "",
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Logger Error:", error);
  }
}