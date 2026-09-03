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

const EXCEL_FILE_PATH = path.resolve(process.cwd(), "ETE25.xlsx");

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI as string);
  
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB.");
    const db = client.db("academicos");
    const usersCollection = db.collection("users");

    const usersToInsert: any[] = [];
    let processedCount = 0;

    console.log("Reading ETE25.xlsx...");
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    
    // Grab the first sheet directly
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    
    const series = "25";
    console.log(`Hashing students for Series ${series} from tab "${firstSheetName}"...`);

    const rows = xlsx.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    // Starting from index 1 assuming row 0 is your header (Roll, Name, etc.)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Need at least 2 columns now (A and B)
      if (!row || row.length < 2) continue; 

      // Column A is index 0, Column B is index 1
      const roll = row[0]; 
      const name = row[1];

      // Make sure roll exists, name is a string, and roll is a valid number
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
          console.log(`... Hashed ${processedCount} students so far ...`);
        }
      }
    }

    if (usersToInsert.length === 0) {
      console.log("⚠️ Still no students found. Please verify the Excel sheet has data starting on row 2.");
      return;
    }

    console.log(`Inserting ${usersToInsert.length} students into the database...`);
    
    const result = await usersCollection.insertMany(usersToInsert);
    console.log(`🎉 Successfully seeded ${result.insertedCount} students!`);

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await client.close();
    console.log("Disconnected from MongoDB.");
  }
}

seedDatabase();