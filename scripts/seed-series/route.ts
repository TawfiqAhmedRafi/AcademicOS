import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("academicos");

    const seriesData = [
      {
        series: "21",
        currentSemester: "4-2",
        semStarted: new Date("2026-08-29"),
        advisorEmail: null,
        advisorName: null,
        status: "active",
        registration: { isOpen: false, deadline: null },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        series: "22",
        currentSemester: "3-2",
        semStarted: new Date("2026-07-18"),
        advisorEmail: null,
        advisorName: null,
        status: "active",
        registration: { isOpen: false, deadline: null },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        series: "23",
        currentSemester: "2-2",
        semStarted: new Date("2026-06-18"),
        advisorEmail: null,
        advisorName: null,
        status: "active",
        registration: { isOpen: false, deadline: null },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        series: "24",
        currentSemester: "2-1",
        semStarted: new Date("2026-07-11"),
        advisorEmail: null,
        advisorName: null,
        status: "active",
        registration: { isOpen: false, deadline: null },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        series: "25",
        currentSemester: "1-1",
        semStarted: new Date("2026-05-10"),
        advisorEmail: null,
        advisorName: null,
        status: "active",
        registration: { isOpen: false, deadline: null },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Clear existing series to prevent duplicates during testing
    await db.collection("series").deleteMany({});
    
    // Inject the real data
    await db.collection("series").insertMany(seriesData);

    return NextResponse.json({ 
      message: "Database successfully seeded with active RUET ETE series!", 
      data: seriesData 
    });
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to seed database" }, { status: 500 });
  }
}