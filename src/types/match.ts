// Read-only types for MatchItems. Node never writes to matchitems collection.

export interface MatchItem {
  _id?: any;
  id: string; // stable hash id
  type: "project" | "thesis";
  course: string; // e.g. "ETE2200"
  series: string; // e.g. "21"
  student_id: string | null;
  studentName: string | null;
  title: string;
  description: string | null;
  members: string[];
  memberNames: string[];
  tags: {
    domain: string[];
    technique: string[];
  };
  source: string; // should be "aos_match"
  importBatch: string;
  updatedBatch?: string;
}
