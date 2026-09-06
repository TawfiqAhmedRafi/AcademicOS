function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function generateTabulationPdf(draft: any): Promise<Buffer> {
  const html = `<!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 portrait; margin: 40px; }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
    .header { text-align: center; margin-bottom: 30px; line-height: 1.4; }
    .header h1 { font-size: 16pt; margin: 0; font-weight: bold; text-transform: uppercase; }
    .header h2 { font-size: 13pt; margin: 5px 0 0 0; }
    .header h3 { font-size: 12pt; margin: 15px 0 5px 0; text-decoration: underline; }
    .meta { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px; font-size: 11pt; }
    table { border-collapse: collapse; margin-bottom: 40px; width: 100%; }
    th, td { border: 1px solid #000; padding: 8px 6px; text-align: center; vertical-align: middle; }
    th { background-color: #f8f8f8; font-weight: bold; font-size: 10pt; }
    .text-left { text-align: left; }
    .remarks { font-size: 9pt; }
    .failed { color: #dc2626; font-weight: bold; }
    .cleared { color: #16a34a; font-weight: bold; }
    .footer { margin-top: 60px; display: flex; justify-content: space-between; font-weight: bold; font-size: 11pt; }
    .footer div { text-align: center; }
    .footer .line { border-top: 1px solid #000; padding-top: 5px; width: 200px; display: inline-block; }
  </style>
  </head>
  <body>
    <div class="header">
      <h1>Rajshahi University of Engineering & Technology</h1>
      <h2>Department of Electronics & Telecommunication Engineering</h2>
      <h3>OFFICIAL TABULATION SHEET</h3>
    </div>
    <div class="meta">
      <span>Series: ${escapeHtml(draft.series)}</span>
      <span>Semester: ${escapeHtml(draft.semester)}</span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width: 15%;">Roll Number</th>
          <th class="text-left" style="width: 35%;">Student Name</th>
          <th style="width: 10%;">Term GPA</th>
          <th style="width: 10%;">CGPA</th>
          <th style="width: 12%;">Earned Credits</th>
          <th style="width: 18%;">Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${draft.results.sort((a: any, b: any) => a.roll.localeCompare(b.roll)).map((res: any) => `
          <tr>
            <td><strong>${escapeHtml(res.roll)}</strong></td>
            <td class="text-left">${escapeHtml(res.name)}</td>
            <td>${res.semesterGpa.toFixed(2)}</td>
            <td><strong>${res.cgpa.toFixed(2)}</strong></td>
            <td>${res.earnedCredits.toFixed(2)}</td>
            <td class="remarks">
              ${res.failedCourses && res.failedCourses.length > 0 
                ? `<span class="failed">${res.failedCourses.map((c: string) => escapeHtml(c)).join(", ")} (F)</span>` 
                : "<span class='cleared'>CLEARED</span>"}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="footer">
      <div><span class="line">Course Advisor</span></div>
      <div><span class="line">Head of the Department</span></div>
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