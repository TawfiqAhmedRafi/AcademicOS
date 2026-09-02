import { MongoClient } from "mongodb";
import * as xlsx from "xlsx";
import bcrypt from "bcryptjs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env");
}

const EXCEL_FILE_PATH = path.resolve(process.cwd(), "ETE Department.xlsx");

// Faculty list parsed from your prompt
const facultyList = [
  { name: "Dr. Md. Kamal Hosain", email: "khosain@ete.ruet.ac.bd", role: "dept_head" },
  { name: "Dr. Mst. Fateha Samad", email: "fateha@ete.ruet.ac.bd", role: "faculty" },
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

    const usersToInsert: any[] = [];
    let processedCount = 0;

    // 1. Process the Faculty List
    console.log("Preparing Faculty records (this will take a moment to hash passwords)...");
    for (const faculty of facultyList) {
      // Use their exact email as the temporary password
      const password_hash = await bcrypt.hash(faculty.email, 12);

      usersToInsert.push({
        name: faculty.name,
        email: faculty.email,
        password_hash,
        role: faculty.role,
        department: "ETE",
        needs_setup: true, 
        loginAttempts: 0,
        createdAt: new Date(),
      });
      processedCount++;
    }

    // 2. Process the Excel File for Students
    console.log("Reading ETE Department.xlsx...");
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    
    for (const sheetName of workbook.SheetNames) {
      const seriesMatch = sheetName.match(/(\d{2})/);
      if (!seriesMatch) continue;
      
      const series = seriesMatch[1];
      console.log(`Hashing students for Series ${series}...`);

      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;

        const roll = row[1] || row[3]; 
        const name = row[2];

        if (roll && name && typeof name === "string" && !isNaN(Number(roll))) {
          const email = `${roll}@student.ruet.ac.bd`;
          
          // Use their exact email as the temporary password
          const password_hash = await bcrypt.hash(email, 12);

          usersToInsert.push({
            name: name.trim(),
            email: email,
            student_id: roll.toString(),
            series: series,
            password_hash,
            role: "student",
            department: "ETE",
            needs_setup: true, 
            loginAttempts: 0,
            createdAt: new Date(),
          });
          
          processedCount++;
          if (processedCount % 50 === 0) {
            console.log(`... Hashed ${processedCount} users so far ...`);
          }
        }
      }
    }

    // 3. Insert everything into MongoDB
    console.log(`Inserting all ${usersToInsert.length} users into the database...`);
    
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