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

  return `<table class="routine-table">
      <thead>
        <tr><th class="corner">Day &rarr;</th>${dayHeaderCells}</tr>
        <tr><th class="corner">&rarr;Period</th>${periodHeaderCells}</tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// Helper to sort teachers logically for the sidebar
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

  const SENIORITY_ORDER = ["kamal", "fateha", "aslam", "yeakub", "rakib", "farzana", "hasan", "saif", "sharaf", "nahin", "rubaeat", "rifa", "mahmudul", "rakibul"];
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

// Add the teachers array to the function signature
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
    body { font-family: "Times New Roman", Times, serif; margin: 0; padding: 18pt 22pt; color: #000; font-size: 8.2pt; background: #fff; }
    .header { text-align: center; margin-bottom: 8pt; line-height: 1.35; }
    .header .l1 { font-size: 10pt; }
    .header .l2 { font-size: 11pt; }
    .header .l3 { font-size: 11pt; font-weight: bold; }
    .header .l4 { font-size: 10pt; }
    .header .l5 { font-size: 9.5pt; }
    table.routine-table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 6pt; }
    table.routine-table th, table.routine-table td { border: 0.75pt solid #000; text-align: center; vertical-align: middle; padding: 1pt 2pt; }
    th.corner { width: 46pt; font-size: 7.5pt; font-weight: bold; }
    th.day-head { font-weight: bold; font-size: 8.5pt; padding: 2pt; }
    th.period-head { font-weight: bold; font-size: 7.5pt; width: 28pt; }
    td.row-label { font-weight: bold; font-size: 7.3pt; line-height: 1.3; }
    td.cell { height: 24pt; }
    td.cell.filled .l1 { font-size: 7.3pt; }
    td.cell.filled .l2 { font-size: 7.3pt; font-weight: bold; }
    td.cell.filled .l3 { font-size: 7.3pt; }
    .bottom-section { display: flex; align-items: flex-start; }
    .bottom-section .routine-table { flex: 1 1 auto; margin-bottom: 0; }
    .side-tables { display: flex; flex-direction: column; margin-left: 8pt; }
    .side-note { text-align: right; font-size: 7.5pt; margin-bottom: 3pt; }
    .side-row { display: flex; gap: 6pt; }
    table.side-table { border-collapse: collapse; font-size: 7.6pt; }
    table.side-table th, table.side-table td { border: 0.75pt solid #000; padding: 1.5pt 4pt; text-align: left; }
    table.side-table thead th { text-align: center; font-weight: bold; }
    td.t-code { text-align: center; width: 22pt; font-weight: bold; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16pt; }
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
            <thead><tr><th colspan="2">Teachers of ETE</th></tr></thead>
            <tbody>${sortedTeachers.map(t => `<tr><td class="t-code">${escapeHtml(t.initials)}</td><td>${escapeHtml(t.name)}</td></tr>`).join("")}</tbody>
          </table>
          <table class="side-table">
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

 let browser;
  if (process.env.NODE_ENV === "development") {
    // Next.js automatically triggers this block when you run 'npm run dev'
    const puppeteer = (await import("puppeteer")).default;
    browser = await puppeteer.launch({ 
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      channel: "chrome" // Forces it to use the Google Chrome installed on your PC
    });
  } else {
    // Vercel automatically triggers this block in production
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = (await import("puppeteer-core")).default;
    browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBytes = await page.pdf({
      width: "14in", 
      height: "8.5in", 
      printBackground: true,
      margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" },
    });
    return Buffer.from(pdfBytes);
  } finally {
    if (browser) await browser.close();
  }
}