import { MongoClient } from "mongodb";
import * as xlsx from "xlsx";
import bcrypt from "bcryptjs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

const EXCEL_FILE_PATH = path.resolve(process.cwd(), "ETE Department.xlsx");
const DEFAULT_PASSWORD = "ruet1234";

// Faculty list parsed from your prompt
const facultyList = [
  { name: "Dr. Md. Kamal Hosain", email: "khosain@ete.ruet.ac.bd", role: "dept_head" },
  { name: "Dr. Mst. Fateha Samad", email: "fateha@ete.ruet.ac.bd", role: "faculty" }, // Added default email
  { name: "Md. Aslam Mollah", email: "ruet10aslam@gmail.com", role: "faculty" },
  { name: "Dr. Md. Yeakub Ali", email: "yeakub@ete.ruet.ac.bd", role: "faculty" },
  { name: "Md. Rakib Hossain", email: "rakib.hossain@ete.ruet.ac.bd", role: "faculty" },
  { name: "Hasan Sarker", email: "hasan_sarker@ete.ruet.ac.bd", role: "faculty" },
  { name: "Farzana Akter", email: "farzana@ete.ruet.ac.bd", role: "faculty" },
  { name: "Md Abu Ismail Siddique", email: "maisiddique@ete.ruet.ac.bd", role: "faculty" },
  { name: "Sharaf Tasnim", email: "sharaftasnim@ete.ruet.ac.bd", role: "faculty" },
  { name: "Mohammed Nazmul Islam Nahin", email: "nazmul.nahin@ete.ruet.ac.bd", role: "faculty" },
  { name: "Rubaeat Ahammed", email: "rubaeat.ahammed@ete.ruet.ac.bd", role: "faculty" },
  { name: "Rifa Tabassum Mim", email: "rifa.mim@ete.ruet.ac.bd", role: "faculty" },
  { name: "Md. Mahmudul Hasan", email: "mahmudul@ete.ruet.ac.bd", role: "faculty" },
  { name: "Md. Rakibul Islam", email: "rakibulislam@ete.ruet.ac.bd", role: "faculty" }
];

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI as string);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB.");
    const db = client.db("academicos");
    const usersCollection = db.collection("users");

    // Hash the default temporary password
    console.log(`Hashing default password: ${DEFAULT_PASSWORD}...`);
    const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    const usersToInsert: any[] = [];

    // 1. Process the Faculty ListF
    console.log("Preparing Faculty records...");
    for (const faculty of facultyList) {
      usersToInsert.push({
        name: faculty.name,
        email: faculty.email,
        password_hash,
        role: faculty.role,
        department: "ETE",
        needs_setup: true, // Forces them to change password and upload photo on first login
        loginAttempts: 0,
        createdAt: new Date(),
      });
    }

    // 2. Process the Excel File for Students
    console.log("Reading ETE Department.xlsx...");
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    
    // Iterate through all the series tabs (e.g., 20 Series, 21 Series...)
    for (const sheetName of workbook.SheetNames) {
      // Extract the series number (e.g., "22" from "22 Series_ETE")
      const seriesMatch = sheetName.match(/(\d{2})/);
      if (!seriesMatch) continue;
      
      const series = seriesMatch[1];
      console.log(`Parsing sheet: ${sheetName} (Series ${series})...`);

      const sheet = workbook.Sheets[sheetName];
      // The Excel format has a weird header, so we start reading from row index 1 (the 2nd row)
      const data = xlsx.utils.sheet_to_json<any>(sheet, { range: 1 });

      for (const row of data) {
        const roll = row["Roll"] || row["Student ID"];
        const name = row["Name"];

        if (roll && name) {
          // Construct the strict RUET email format
          const email = `${roll}@student.ruet.ac.bd`;

          usersToInsert.push({
            name: name,
            email: email,
            student_id: roll.toString(),
            series: series,
            password_hash,
            role: "student",
            department: "ETE",
            needs_setup: true, // Intercepts their first login
            loginAttempts: 0,
            createdAt: new Date(),
          });
        }
      }
    }

    // 3. Insert everything into MongoDB
    console.log(`Inserting ${usersToInsert.length} users into the database...`);
    
    // Clear the collection first to avoid duplicates if you run it multiple times (optional)
    await usersCollection.deleteMany({});
    
    const result = await usersCollection.insertMany(usersToInsert);
    console.log(`🎉 Successfully seeded ${result.insertedCount} users!`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB.");
  }
}

seedDatabase();