import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env");
}

const COURSES_JSON_PATH = path.resolve(process.cwd(), "courses.json");

async function seedCourses() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB.");
    const db = client.db("academicos");
    const coursesCollection = db.collection("courses");

    console.log("Reading courses.json...");
    const rawData = fs.readFileSync(COURSES_JSON_PATH, "utf-8");
    
    // Parse and map the JSON to enforce the isProject boolean fallback
    const courses = JSON.parse(rawData).map((course: any) => ({
      courseCode: course.courseCode,
      title: course.title,
      semester: course.semester,
      credits: course.credits,
      creditHours: course.creditHours,
      isSessional: course.isSessional,
      isElective: course.isElective,
      pairedCourseCode: course.pairedCourseCode,
      syllabus: course.syllabus,
      // The crucial fallback: If it's not strictly true, make it false
      isProject: course.isProject === true 
    }));

    console.log(`Found ${courses.length} courses. Inserting into database...`);

    // Wipe the old collection to avoid duplicates
    await coursesCollection.deleteMany({});
    const result = await coursesCollection.insertMany(courses);

    console.log(`🎉 Successfully seeded ${result.insertedCount} courses into MongoDB!`);
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB.");
  }
}

seedCourses();