/**
 * Shared helper: sends an HTML string to the Python PDF service (WeasyPrint)
 * and returns the raw PDF Buffer.
 *
 * Used by routine-pdf.ts, tabulation-pdf.ts, and calendar-pdf.ts.
 */

const PDF_BASE =
  (process.env.MATCH_URL || "http://127.0.0.1:8001/match").replace(/\/match\/?$/, "");
const MATCH_API_KEY = process.env.MATCH_API_KEY || "testkey";

export async function renderPdfViaService(
  html: string,
  pageWidth = "210mm",
  pageHeight = "297mm",
): Promise<Buffer> {
  const url = `${PDF_BASE}/match/pdf`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": MATCH_API_KEY,
    },
    body: JSON.stringify({ html, pageWidth, pageHeight }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Error(`PDF service returned ${res.status}: ${text}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
