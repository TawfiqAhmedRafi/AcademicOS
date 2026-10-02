"""
Lightweight PDF generation service using WeasyPrint.

Accepts a full HTML string (with embedded CSS) and returns raw PDF bytes.
No headless browser required — WeasyPrint renders directly using Cairo/Pango.
"""

import logging
from weasyprint import HTML

logger = logging.getLogger(__name__)


def html_to_pdf(
    html: str,
    page_width: str = "210mm",
    page_height: str = "297mm",
) -> bytes:
    """
    Convert an HTML string to PDF bytes.

    Parameters
    ----------
    html : str
        Complete HTML document (including <!DOCTYPE html>, <style>, etc.).
    page_width : str
        CSS page width, e.g. "210mm" (A4), "14in" (routine landscape).
    page_height : str
        CSS page height, e.g. "297mm" (A4), "8.5in" (routine landscape).

    Returns
    -------
    bytes
        Raw PDF file content.
    """
    # The HTML templates already contain their own @page CSS rules
    # (e.g. A4 portrait, landscape, margins). WeasyPrint respects them.
    doc = HTML(string=html)
    pdf_bytes = doc.write_pdf()
    logger.info("PDF generated: %d bytes", len(pdf_bytes))
    return pdf_bytes
