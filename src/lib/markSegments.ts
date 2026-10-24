// Single source of truth for how a course is divided into mark segments.
// Used by the Marks Upload page, the Excel template generator and the
// unified upload endpoint so that separate and unified uploads always
// produce exactly the same `course_marks` segment documents.

export type SegmentCourseInfo = {
  courseCode: string;
  type?: string;
  teacherCount?: number;
  isBacklog?: boolean;
};

// Dynamic Segments based on Course Code Patterns & Teacher Count
export const getSegments = (course: SegmentCourseInfo): string[] => {
  if (course.isBacklog) {
    return ["Semester Final (Backlog)"];
  }

  const code = (course.courseCode || "").toUpperCase();

  // --- SPECIAL RUET PROJECT / THESIS / SEMINAR PATTERNS ---
  if (code.includes("2200") || code.includes("3200")) {
    return ["Supervisor", "Showcase", "Board Viva"];
  }
  if (code.includes("3218")) {
    return ["Supervisor", "Seminar 1", "Seminar 2"];
  }
  if (code.includes("4100")) {
    return ["Supervisor", "Pre Defense", "Board Viva"];
  }
  if (code.includes("4200")) {
    return ["Supervisor", "Defense", "Board Viva"];
  }

  // --- REGULAR THEORY ---
  if (course.type === "theory") {
    if ((course.teacherCount || 1) > 1)
      return [
        "Class Tests (2)",
        "Assignment",
        "Attendance",
        "Semester Final (Part)",
      ];
    return [
      "Class Tests (4)",
      "Assignment",
      "Attendance",
      "Semester Final (Full)",
    ];
  }

  // --- STANDARD SESSIONAL/LAB ---
  return [
    "Attendance",
    "Quiz",
    "Lab Report",
    "Performance",
    "Lab Viva",
    "Lab Final",
    "Board Viva",
  ];
};

// ---------------------------------------------------------------------------
// UNIFIED (single sheet) UPLOAD
// ---------------------------------------------------------------------------

export type UnifiedColumn = {
  header: string; // Excel column header
  segment: string; // Target course_marks segment (identical to separate mode)
  field: "mark" | "ct1" | "ct2" | "ct3" | "ct4";
};

// Column order inside the unified sheet
const UNIFIED_ORDER = [
  "Attendance",
  "Class Tests",
  "Assignment",
  "Semester Final",
  "Quiz",
  "Lab Report",
  "Performance",
  "Lab Final",
  "Lab Viva",
  "Seminar 1",
  "Seminar 2",
  "Supervisor",
  "Showcase",
  "Pre Defense",
  "Defense",
  "Board Viva",
];

const orderRank = (segment: string) => {
  const idx = UNIFIED_ORDER.findIndex((o) => segment === o || segment.startsWith(o));
  return idx === -1 ? UNIFIED_ORDER.length : idx;
};

// Expands the course's segments into unified sheet columns.
// Class Tests (N) -> CT-1..CT-N, everything else -> one direct-mark column.
// Attendance is a direct mark in unified mode.
export const getUnifiedColumns = (course: SegmentCourseInfo): UnifiedColumn[] => {
  const segments = [...getSegments(course)].sort((a, b) => orderRank(a) - orderRank(b));
  const columns: UnifiedColumn[] = [];

  segments.forEach((segment) => {
    const ctMatch = segment.match(/^Class Tests \((\d)\)$/);
    if (ctMatch) {
      const count = Number(ctMatch[1]);
      for (let i = 1; i <= count; i++) {
        columns.push({ header: `CT-${i}`, segment, field: `ct${i}` as UnifiedColumn["field"] });
      }
    } else {
      columns.push({ header: segment, segment, field: "mark" });
    }
  });

  return columns;
};
