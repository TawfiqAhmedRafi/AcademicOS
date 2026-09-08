export async function generateCalendarPdf(calendar: any, seriesConfig: any, headDetails: any): Promise<Buffer> {
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Safely extract Advisors
  const advisor1 = seriesConfig?.advisor1 || null;
  const advisor2 = seriesConfig?.advisor2 || null;

  // Safely default arrays
  const scheduleEvents = calendar?.scheduleEvents || [];
  const ctSchedule = calendar?.ctSchedule || [];
  const finalSchedule = calendar?.finalSchedule || [];

  const html = `<!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8" />
  <style>
    /* Shrink page margins to utilize more paper space */
    @page { size: A4 portrait; margin: 30px 40px; }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; font-size: 10pt; color: #000; margin: 0; padding: 0; line-height: 1.2; }
    
    /* Header layout compressed vertically */
    .header { text-align: center; margin-bottom: 12px; }
    .header .quote { font-style: italic; font-size: 10pt; }
    .header h1 { font-size: 13pt; margin: 0; font-weight: bold; }
    .header h2 { font-size: 11pt; margin: 4px 0 0 0; font-weight: bold; }
    .header h3 { font-size: 11.5pt; margin: 10px 0 4px 0; text-decoration: underline; font-weight: bold; }
    
    /* Tables styling compressed */
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt; }
    th, td { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
    
    /* Dark Header matching photo - enforced print colors */
    .table-title { background-color: #1a1a1a; color: #fff; font-weight: bold; text-align: center; font-size: 10.5pt; padding: 3px; border: 1px solid #1a1a1a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .col-header { background-color: #e5e5e5; font-weight: bold; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    /* Specific Table Alignments */
    .t1-desc { text-align: left; font-weight: normal; }
    .t1-date { text-align: center; width: 15%; }
    .t1-to { text-align: center; width: 4%; border-left: none; border-right: none; }
    .t1-from { border-right: none; }
    .t1-dur { text-align: center; width: 12%; }
    
    .t2-col { text-align: center; }
    .t2-course { text-align: left; font-weight: bold; width: 20%; }
    
    .t3-table { width: 50%; margin: 0 auto 15px auto; }
    .t3-col { text-align: center; }

    /* Alternate Row Shading */
    tr:nth-child(even) td { background-color: #f9f9f9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Notes */
    .notes { margin-top: -6px; margin-bottom: 15px; font-size: 9pt; line-height: 1.3; padding-left: 20px; }
    
    /* Signatures compressed */
    .signatures { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px; font-size: 10pt; text-align: center; }
    .sign-block { width: 30%; }
    .sign-line { border-top: 1px solid #000; margin-top: 30px; padding-top: 4px; font-weight: bold; }
    .sign-title { font-size: 9pt; }
  </style>
  </head>
  <body>
    <div class="header">
      <div class="quote">"Heaven's Light is Our Guide"</div>
      <h1>Rajshahi University of Engineering & Technology (RUET)</h1>
      <h2>Department of Electronics & Telecommunication Engineering</h2>
      <h3>Academic Calendar of Semester ${escapeHtml(calendar?.semester)} (${escapeHtml(calendar?.series)} Series)</h3>
    </div>

    <!-- TABLE 1: Events -->
    <table>
      <thead>
        <tr><td colspan="5" class="table-title">Class and Examination Schedule</td></tr>
        <tr>
          <th class="col-header">Description</th>
          <th class="col-header" colspan="3">Date</th>
          <th class="col-header">Duration</th>
        </tr>
      </thead>
      <tbody>
        ${scheduleEvents.map((ev: any) => `
          <tr>
            <td class="t1-desc">${escapeHtml(ev.description)}</td>
            <td class="t1-date t1-from">${formatShortDate(ev.from)}</td>
            <td class="t1-to">${ev.to ? 'to' : ''}</td>
            <td class="t1-date">${formatShortDate(ev.to)}</td>
            <td class="t1-dur">${escapeHtml(ev.duration)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="notes">
      N.B: 1. All vacations are excluded from the academic calendar.<br/>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2. Class period may vary according to the RUET annual calendar.
    </div>

    <!-- TABLE 2: CT Schedule -->
    <table>
      <thead>
        <tr>
          <th class="col-header t2-course">Course No.</th>
          <th class="col-header">CT 01</th>
          <th class="col-header">CT 02</th>
          <th class="col-header">CT 03</th>
          <th class="col-header">CT 04</th>
        </tr>
      </thead>
      <tbody>
        ${ctSchedule.map((ct: any) => `
          <tr>
            <td class="t2-course">${escapeHtml(ct.courseCode)}</td>
            <td class="t2-col">${formatShortDate(ct.ct1)}</td>
            <td class="t2-col">${formatShortDate(ct.ct2)}</td>
            <td class="t2-col">${formatShortDate(ct.ct3)}</td>
            <td class="t2-col">${formatShortDate(ct.ct4)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- TABLE 3: Final Schedule -->
    <h3 style="text-align: center; font-size: 11pt; text-decoration: underline; margin-bottom: 8px;">Tentative Schedule for Final Examination:</h3>
    <table class="t3-table">
      <thead>
        <tr>
          <th class="col-header">Date</th>
          <th class="col-header">Examination</th>
        </tr>
      </thead>
      <tbody>
        ${finalSchedule.map((fs: any) => `
          <tr>
            <td class="t3-col">${formatShortDate(fs.date)}</td>
            <td class="t3-col">${escapeHtml(fs.exam)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- SIGNATURES -->
    <div class="signatures">
      <div class="sign-block">
        ${advisor1 ? `
          <div class="sign-line">${escapeHtml(advisor1.name)}</div>
          <div class="sign-title">Course Advisor<br/>Dept. of ETE, RUET.</div>
        ` : ''}
      </div>
      
      <div class="sign-block">
        ${advisor2 ? `
          <div class="sign-line">${escapeHtml(advisor2.name)}</div>
          <div class="sign-title">Course Advisor<br/>Dept. of ETE, RUET.</div>
        ` : ''}
      </div>

      <div class="sign-block">
        <div class="sign-title" style="margin-bottom: 15px; text-decoration: underline;">Approved By:</div>
        <div class="sign-line">${escapeHtml(headDetails?.name || "Head of Department")}</div>
        <div class="sign-title">Head<br/>Dept. of ETE, RUET.</div>
      </div>
    </div>
  </body>
  </html>`;

  let browser;
  if (process.env.NODE_ENV === "development") {
    const puppeteer = (await import("puppeteer")).default;
    browser = await puppeteer.launch({ 
      headless: true, 
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      channel: "chrome" 
    });
  } else {
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
      format: "A4",
      landscape: false,
      printBackground: true,
      margin: { top: "0in", right: "0in", bottom: "0in", left: "0in" },
    });
    return Buffer.from(pdfBytes);
  } finally {
    if (browser) await browser.close();
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}