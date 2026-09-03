import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = "mongodb+srv://academicos:Rypokr0hhvx81HYa@cluster0.eemz9pt.mongodb.net/academicos?appName=Cluster0";

if (!uri) {
  throw new Error('MONGODB_URI is not defined. Check your .env file.');
}

async function seedFacultyUsers() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB successfully.');

    const db = client.db('academicos');
    const usersCollection = db.collection('users');

    const saltRounds = 12;

    // Define the users
    const newUsers = [
      {
        name: 'Course Advisor',
        email: 'benihme990@gmail.com',
        role: 'course_advisor',
        department: 'ETE',
        advising_series: '22', // Specific to course advisors
        needs_setup: true, // Forces them to change their password on first login
        loginAttempts: 0,
        createdAt: new Date()
      },
      {
        name: 'Department Head',
        email: 'ahmedrafi70722@gmail.com',
        role: 'dept_head',
        department: 'ETE',
        needs_setup: true,
        loginAttempts: 0,
        createdAt: new Date()
      },
      {
        name: 'Faculty Member',
        email: 'rafi6868242@gmail.com',
        role: 'faculty',
        department: 'ETE',
        needs_setup: true,
        loginAttempts: 0,
        createdAt: new Date()
      }
    ];

    // Generate hashes using their emails as the temporary password
    for (const user of newUsers) {
      const password_hash = await bcrypt.hash(user.email, saltRounds);
      // Attach the hash to the object before inserting
      (user as any).password_hash = password_hash;
    }

    // Insert all users into the database
    const result = await usersCollection.insertMany(newUsers);
    
    console.log(`Success! Inserted ${result.insertedCount} users.`);
    console.log('Inserted IDs:', result.insertedIds);

  } catch (error) {
    console.error('Failed to insert users:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

seedFacultyUsers();