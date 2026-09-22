import clientPromise from "@/lib/mongodb";
import CourseCatalog from "./CourseCatalog";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  const isHead = session?.user?.role === "dept_head";

  const client = await clientPromise;
  const db = client.db("academicos");

  const courses = await db.collection("courses")
    .find({})
    .sort({ semester: 1, courseCode: 1 }) 
    .toArray();

  const serializedCourses = courses.map((c) => ({
    _id: c._id.toString(),
    courseCode: c.courseCode,
    title: c.title,
    semester: c.semester || c.level, 
    credits: c.credits,
    creditHours: c.creditHours || c.contactHours, 
    isSessional: c.isSessional,
    isElective: c.isElective,
    isProject: c.isProject || false,
    pairedCourseCode: c.pairedCourseCode,
    syllabus: c.syllabus,
  }));

  return (
    <div className="relative flex min-h-screen flex-col selection:bg-ruet-gold selection:text-black dark:bg-[#020617]">
        <Navbar/>
      <div className="fixed top-1/4 left-0 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-ruet-blue/20 blur-[150px] dark:bg-ruet-blue/20"></div>
      <div className="fixed bottom-1/4 right-0 -z-10 h-[400px] w-[400px] translate-x-1/3 rounded-full bg-ruet-gold/10 blur-[120px] dark:bg-ruet-gold/10"></div>
      
      <main className="flex-1 w-full pt-28 pb-16 px-4 sm:px-6 lg:px-12 2xl:px-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Course <span className="text-ruet-blue dark:text-ruet-gold">Catalog</span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
              Explore the complete curriculum for the Department of Electronics & Telecommunication Engineering.
            </p>
          </div>
          
          <CourseCatalog initialCourses={serializedCourses} isHead={isHead} />
        </div>
      </main>
      <Footer/>
    </div>
  );
}