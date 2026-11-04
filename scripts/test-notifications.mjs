/**
 * Automated test suite for the role- and series-based Notification System.
 * Usage: node scripts/test-notifications.mjs
 */
import { buildUserAudienceQuery, createNotification } from "../src/lib/notifications.js";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let passed = 0;
let failed = 0;

function assert(description, condition, extra = "") {
  if (condition) {
    passed++;
    console.log(`  PASS: ${description}`);
  } else {
    failed++;
    console.error(`  FAIL: ${description} ${extra}`);
  }
}

// 1. UNIT TESTS: Test audience query generation in-memory
console.log("\n--- 1. Testing Audience Query Generator (buildUserAudienceQuery) ---");

// Persona 1: Series 22 Student
const s22Student = {
  _id: new ObjectId("600000000000000000000001"),
  role: "student",
  series: "22",
};
const qS22 = buildUserAudienceQuery(s22Student);

assert("Student query targets student role", JSON.stringify(qS22).includes('"audience.roles":{"$in":["student"]}'));
assert("Student query includes their series 22", JSON.stringify(qS22).includes('"audience.series":{"$in":["22"]}'));
assert("Student query excludes actions performed by themself", qS22.actorId.$ne === "600000000000000000000001");

// Persona 2: Series 21 Student
const s21Student = {
  _id: new ObjectId("600000000000000000000002"),
  role: "student",
  series: "21",
};
const qS21 = buildUserAudienceQuery(s21Student);

assert("Student 21 query targets series 21", JSON.stringify(qS21).includes('"audience.series":{"$in":["21"]}'));
assert("Student 21 query does NOT target series 22", !JSON.stringify(qS21).includes('"audience.series":{"$in":["22"]}'));

// Persona 3: Faculty member with Advisor duties for Series 22 and 23
const advisorUser = {
  _id: new ObjectId("600000000000000000000003"),
  role: "faculty",
  advising_series: "22, 23",
};
const qAdv = buildUserAudienceQuery(advisorUser);

assert("Advisor has faculty and advisor roles", JSON.stringify(qAdv).includes('"audience.roles":{"$in":["faculty","advisor"]}'));
assert("Advisor query matches series 22 and 23", JSON.stringify(qAdv).includes('"audience.series":{"$in":["22","23"]}'));

// Persona 4: Dept Head
const headUser = {
  _id: new ObjectId("600000000000000000000004"),
  role: "dept_head",
};
const qHead = buildUserAudienceQuery(headUser);
assert("Dept Head includes dept_head, faculty, and advisor roles", JSON.stringify(qHead).includes('"audience.roles":{"$in":["dept_head","faculty","advisor"]}'));

// Persona 5: Admin
const adminUser = {
  _id: new ObjectId("600000000000000000000005"),
  role: "admin",
};
const qAdmin = buildUserAudienceQuery(adminUser);
assert("Admin query targets admin role", JSON.stringify(qAdmin).includes('"audience.roles":{"$in":["admin"]}'));

// 2. SIMULATION TESTS: Test matching simulated notification documents against queries
console.log("\n--- 2. Testing Audience Matching Simulation ---");

function matchesQuery(doc, user) {
  const userId = String(user._id);
  // Direct target
  if (doc.audience.userIds && doc.audience.userIds.includes(userId)) return true;
  // Actor exclusion
  if (doc.actorId && doc.actorId === userId) return false;

  const roles = user.role === "dept_head" ? ["dept_head", "faculty"] : [user.role];
  if (user.advising_series) roles.push("advisor");

  const roleMatches = doc.audience.roles && doc.audience.roles.some((r) => roles.includes(r));
  if (!roleMatches) return false;

  // Dept Head and Admin match any series if doc targets dept_head or admin
  if ((user.role === "dept_head" || user.role === "admin") && doc.audience.roles.some((r) => ["dept_head", "admin"].includes(r))) {
    return true;
  }

  // Series check
  if (!doc.audience.series || doc.audience.series.length === 0) return true;
  const userSeriesList = [];
  if (user.series) userSeriesList.push(String(user.series));
  if (user.advising_series) {
    userSeriesList.push(...user.advising_series.split(",").map((s) => s.trim()));
  }

  return doc.audience.series.some((s) => userSeriesList.includes(s));
}

// Notice for Series 22
const notifSeries22 = {
  audience: { roles: ["student"], series: ["22"], userIds: [] },
  actorId: "999",
};
assert("Series 22 student matches Series 22 notice", matchesQuery(notifSeries22, s22Student) === true);
assert("Series 21 student DOES NOT match Series 22 notice", matchesQuery(notifSeries22, s21Student) === false);
assert("Advisor DOES NOT match student-only notice", matchesQuery(notifSeries22, advisorUser) === false);

// Notice for All Series (public)
const notifAll = {
  audience: { roles: ["student", "faculty"], series: null, userIds: [] },
  actorId: "999",
};
assert("Series 22 student matches public notice", matchesQuery(notifAll, s22Student) === true);
assert("Series 21 student matches public notice", matchesQuery(notifAll, s21Student) === true);
assert("Faculty matches public notice", matchesQuery(notifAll, advisorUser) === true);

// Routine for Series 22 with assigned teacher
const teacherId = "600000000000000000000003";
const notifRoutine = {
  audience: { roles: ["student"], series: ["22"], userIds: [teacherId] },
  actorId: "999",
};
assert("Series 22 student matches Series 22 routine", matchesQuery(notifRoutine, s22Student) === true);
assert("Series 21 student DOES NOT match Series 22 routine", matchesQuery(notifRoutine, s21Student) === false);
assert("Assigned teacher matches routine via userIds", matchesQuery(notifRoutine, advisorUser) === true);

// Advisor-specific notification for Series 22
const notifAdvisor = {
  audience: { roles: ["advisor"], series: ["22"], userIds: [] },
  actorId: "999",
};
assert("Advisor for Series 22 matches advisor notification", matchesQuery(notifAdvisor, advisorUser) === true);
assert("Student DOES NOT match advisor notification", matchesQuery(notifAdvisor, s22Student) === false);

// Registration submitted by student 2204040 targeting advisor directly via userIds and role
const advisorUserId = String(advisorUser._id);
const notifStudentReg = {
  audience: {
    roles: ["advisor", "dept_head"],
    series: ["22"],
    userIds: [advisorUserId],
  },
  actorId: String(s22Student._id),
};
assert("Advisor matches student registration via userIds", matchesQuery(notifStudentReg, advisorUser) === true);
assert("Student who submitted DOES NOT get notified as advisor", matchesQuery(notifStudentReg, s22Student) === false);
assert("Dept Head matches student registration", matchesQuery(notifStudentReg, headUser) === true);

// Actor exclusion test
const selfTriggeredNotif = {
  audience: { roles: ["student"], series: ["22"], userIds: [] },
  actorId: String(s22Student._id), // Student triggered this action
};
assert("User is not notified about their own action", matchesQuery(selfTriggeredNotif, s22Student) === false);

console.log(`\n========================================`);
console.log(`Test Results: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
