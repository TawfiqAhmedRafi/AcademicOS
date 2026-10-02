const PERIOD_SCHEDULE = [
  { period: "1st", time: "8.00-8.50" }, { period: "2nd", time: "8:50-9:40" },
  { period: "3rd", time: "9:40-10:30" }, { period: "Break", time: "10:30-10:50" },
  { period: "4th", time: "10.50-11.40" }, { period: "5th", time: "11.40-12.30" },
  { period: "6th", time: "12.30-1.20" }, { period: "P&LB", time: "1.20-2.30" },
  { period: "7th", time: "2.30-3.20" }, { period: "8th", time: "3.20-4.10" },
  { period: "9th", time: "4.10-5.00" },
];

const NUM_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DAY_GROUPS = [["Saturday", "Sunday", "Monday"], ["Tuesday", "Wednesday"]];

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildGrid(seriesSlots: any[], days: string[]) {
  const grid: any = {};
  days.forEach((d) => {
    grid[d] = {};
    NUM_PERIODS.forEach((p) => (grid[d][p] = null));
  });
  const consumed = new Set<string>();
  seriesSlots.forEach((slot) => {
    if (!days.includes(slot.day)) return;
    const key = `${slot.day}-${slot.startPeriod}`;
    if (consumed.has(key)) return;
    const span = slot.periodSpan || 1;
    const spanPeriods = Array.from({ length: span }, (_, i) => slot.startPeriod + i);
    grid[slot.day][slot.startPeriod] = slot;
    spanPeriods.slice(1).forEach((p) => {
      consumed.add(`${slot.day}-${p}`);
      grid[slot.day][p] = "CONSUMED";
    });
  });
  return grid;
}

function renderCell(slot: any): string {
  if (slot === "CONSUMED") return "";
  if (!slot) return `<td class="cell"></td>`;
  const room = slot.room && slot.room !== "N/A" ? escapeHtml(slot.room) : "";
  const course = escapeHtml(slot.courseCode || "");
  const teachers = (slot.teachers || []).filter((t: string) => t !== "N/A" && Boolean(t)).join(" / ");
  const span = slot.periodSpan && slot.periodSpan > 1 ? ` colspan="${slot.periodSpan}"` : "";
  return `<td class="cell filled"${span}>
      ${room ? `<div class="l1">${room}</div>` : ""}
      <div class="l2">${course}</div>
      ${teachers ? `<div class="l3">${escapeHtml(teachers)}</div>` : ""}
    </td>`;
}

function renderDayGroupTable(days: string[], configs: any[], slots: any[]): string {
  const dayHeaderCells = days.map((d) => `<th colspan="9" class="day-head">${escapeHtml(d)}</th>`).join("");
  const periodHeaderCells = days.map(() => NUM_PERIODS.map((p) => `<th class="period-head">${p}</th>`).join("")).join("");
  
  // Create strict columns for perfect alignment
  const cols = `<col style="width:68pt;" />` + days.map(() => NUM_PERIODS.map(() => `<col style="width:33.33pt;" />`).join("")).join("");

  const rows = configs.map((cfg) => {
      const seriesSlots = slots.filter((s) => Number(s.series) === Number(cfg.series));
      const grid = buildGrid(seriesSlots, days);
      const dayCells = days.map((d) => NUM_PERIODS.map((p) => renderCell(grid[d][p])).join("")).join("");
      const semLabel = String(cfg.currentSemester).includes("even") || String(cfg.currentSemester).endsWith("-2") ? "EVEN SEM" : "ODD SEM";
      
      return `<tr>
          <td class="row-label">${semLabel}<br/>(${escapeHtml(cfg.series)} Series)</td>
          ${dayCells}
        </tr>`;
    }).join("");

  return `<table class="routine-table" style="width: ${68 + (days.length * 300)}pt;">
      <colgroup>${cols}</colgroup>
      <thead>
        <tr><th class="corner">Day &rarr;</th>${dayHeaderCells}</tr>
        <tr><th class="corner">&rarr;Period</th>${periodHeaderCells}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function sortTeachers(teachersList: any[]) {
  const designationRank = (t: any) => {
    const role = (t.role || "").toLowerCase();
    const desig = (t.designation || "").toLowerCase();
    if (role === "hod" || role === "dept_head") return 0;
    if (desig.includes("professor") && !desig.includes("associate") && !desig.includes("assistant")) return 1;
    if (desig.includes("associate professor")) return 2;
    if (desig.includes("assistant professor")) return 3;
    if (desig.includes("lecturer")) return 4;
    return 5;
  };

  const SENIORITY_ORDER = ["kamal", "fateha", "aslam", "yeakub", "rakib", "hasan", "farzana", "saif", "sharaf", "nahin", "rubaeat", "rifa", "mahmudul", "rakibul"];
  const seniorityIndex = (name: string) => {
    const words = (name || "").toLowerCase().replace(/[.,]/g, "").split(/\s+/);
    const idx = SENIORITY_ORDER.findIndex((key) => words.includes(key));
    return idx === -1 ? SENIORITY_ORDER.length : idx; 
  };

  return teachersList
    .filter(t => t.initials && t.name)
    .sort((a, b) => {
      const rankDiff = designationRank(a) - designationRank(b);
      if (rankDiff !== 0) return rankDiff;
      const seniorityDiff = seniorityIndex(a.name) - seniorityIndex(b.name);
      if (seniorityDiff !== 0) return seniorityDiff;
      return a.name.localeCompare(b.name);
    });
}

export async function generateRoutinePdf(configs: any[], slots: any[], teachers: any[]): Promise<Buffer> {
  const sortedConfigs = [...configs].sort((a, b) => Number(b.series) - Number(a.series));
  const seriesHeading = sortedConfigs.map(c => c.series).join(", ") + " Series";
  const effectiveDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  
  const sortedTeachers = sortTeachers(teachers);

  const html = `<!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8" />
  <style>
    @page { size: 1008pt 612pt; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 18pt 20pt; color: #000; font-size: 8.2pt; background: #fff; }
    
    .header { text-align: center; margin-bottom: 8pt; line-height: 1.35; }
    .header .l1 { font-size: 10pt; }
    .header .l2 { font-size: 11pt; }
    .header .l3 { font-size: 11pt; font-weight: bold; }
    .header .l4 { font-size: 10pt; }
    .header .l5 { font-size: 9pt; }
    
    /* Strict Table Geometry */
    table { border-collapse: collapse; table-layout: fixed; }
    th, td { border: 0.75pt solid #000; text-align: center; vertical-align: middle; overflow: hidden; }
    table.routine-table { margin-bottom: 6pt; }
    
    /* Fixed Heights and Widths */
    th.corner { height: 16pt; font-size: 7.5pt; font-weight: bold; }
    th.day-head { height: 16pt; font-size: 8.5pt; font-weight: bold; padding: 2pt; }
    th.period-head { height: 14pt; font-size: 7.5pt; font-weight: bold; }
    
    td.row-label { height: 36pt; font-size: 7.5pt; font-weight: bold; line-height: 1.25; }
    td.cell { height: 36pt; padding: 1pt; }
    
    /* Text Wrapping & Reduced Font Sizes */
    td.cell.filled .l1 { font-size: 6pt; line-height: 1.1; word-wrap: break-word; }
    td.cell.filled .l2 { font-size: 6.5pt; font-weight: bold; line-height: 1.1; margin: 1pt 0; word-wrap: break-word; } 
    td.cell.filled .l3 { font-size: 6pt; line-height: 1.1; word-wrap: break-word; }
    
    /* Bottom Layout Alignment */
    .bottom-section { display: flex; align-items: flex-start; width: 968pt; }
    .side-tables { display: flex; flex-direction: column; margin-left: 6pt; width: 294pt; }
    .side-note { text-align: right; font-size: 7.5pt; margin-bottom: 3pt; padding-right: 2pt; font-weight: bold; }
    .side-row { display: flex; justify-content: space-between; width: 100%; }
    
    table.side-table { width: 49%; font-size: 7.5pt; }
    table.side-table th, table.side-table td { padding: 1.5pt 4pt; text-align: left; height: 12pt; }
    table.side-table thead th { text-align: center; font-weight: bold; }
    td.t-code { text-align: center; width: 28pt; font-weight: bold; }
    
    /* Footer */
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 14pt; }
    .footer .note { font-size: 11pt; font-weight: bold; }
    .footer .sign { text-align: center; font-size: 8.5pt; }
    .footer .sign .line { display: block; margin-bottom: 3pt; }
    .footer .sign .name { font-weight: bold; border-top: 0.75pt solid #000; padding-top: 2pt; }
  </style>
  </head>
  <body>
    <div class="header">
      <div class="l1">Heaven's Light is Our Guide</div>
      <div class="l2">Rajshahi University of Engineering &amp; Technology</div>
      <div class="l3">Department of Electronics &amp; Telecommunication Engineering</div>
      <div class="l4">Class Routine for ${escapeHtml(seriesHeading)}</div>
      <div class="l5">Effective from ${escapeHtml(effectiveDate)}</div>
    </div>
    
    ${renderDayGroupTable(DAY_GROUPS[0], sortedConfigs, slots)}
    
    <div class="bottom-section">
      ${renderDayGroupTable(DAY_GROUPS[1], sortedConfigs, slots)}
      
      <div class="side-tables">
        <div class="side-note">P&amp;LB = Prayer &amp; Lunch Break</div>
        <div class="side-row">
          <table class="side-table">
            <colgroup><col style="width:28pt;" /><col /></colgroup>
            <thead><tr><th colspan="2">Teachers of ETE</th></tr></thead>
            <tbody>${sortedTeachers.map(t => `<tr><td class="t-code">${escapeHtml(t.initials)}</td><td>${escapeHtml(t.name)}</td></tr>`).join("")}</tbody>
          </table>
          <table class="side-table">
            <colgroup><col style="width:30pt;" /><col /></colgroup>
            <thead><tr><th>Period</th><th>Time Schedule</th></tr></thead>
            <tbody>${PERIOD_SCHEDULE.map(r => `<tr><td>${r.period}</td><td>${r.time}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="note">Note: Please follow this routine strictly<br/>"There will be no further change"</div>
      <div class="sign"><span class="line">Head of the Dept: ____________________</span><span class="name">Prof. Dr. Md. Kamal Hosain</span></div>
    </div>
  </body>
  </html>`;

  const { renderPdfViaService } = await import("./pdf-client");
  return renderPdfViaService(html, "14in", "8.5in");
}