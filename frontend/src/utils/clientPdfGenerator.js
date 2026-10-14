import { jsPDF } from 'jspdf';
import { formatIndianNumber, formatInvoiceDate, numberToWords } from './formatters.js';

/**
 * Draws a rectangle with stroke and optional fill in jsPDF.
 */
function drawBox(doc, x, y, w, h, { fill = null, stroke = '#000000', lineWidth = 0.5 } = {}) {
  doc.setLineWidth(lineWidth);
  
  if (stroke) {
    doc.setDrawColor(0, 0, 0);
  }
  
  if (fill) {
    if (fill === '#EAEAEA' || fill === 'FFEAEAEA') {
      doc.setFillColor(234, 234, 234);
    } else {
      doc.setFillColor(245, 245, 245);
    }
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
}

/**
 * Draws text inside a bounding box with horizontal and vertical alignment.
 */
function drawText(doc, text, x, y, w, h, {
  size = 7.5,
  color = [0, 0, 0],
  align = 'center',
  valign = 'middle',
  bold = false,
  lineGap = 1
} = {}) {
  if (text === undefined || text === null || text === '') return;
  const str = String(text);

  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(size);
  doc.setTextColor(color[0] ?? 0, color[1] ?? 0, color[2] ?? 0);

  const maxTextWidth = Math.max(10, w - 6);
  const lines = doc.splitTextToSize(str, maxTextWidth);
  const lineHeight = size * 1.15 + lineGap;
  const totalTextHeight = lines.length * lineHeight;

  const baselineOffset = size * 0.82;
  let startY = y + 2 + baselineOffset;

  if (valign === 'middle') {
    startY = y + Math.max(0, (h - totalTextHeight) / 2) + baselineOffset;
  } else if (valign === 'bottom') {
    startY = y + Math.max(0, h - totalTextHeight - 2) + baselineOffset;
  } else if (valign === 'top') {
    startY = y + 2 + baselineOffset;
  }

  lines.forEach((line, i) => {
    const lineY = startY + (i * lineHeight);
    let lineX = x + 3;

    if (align === 'center') {
      lineX = x + (w / 2);
      doc.text(line, lineX, lineY, { align: 'center' });
    } else if (align === 'right') {
      lineX = x + w - 3;
      doc.text(line, lineX, lineY, { align: 'right' });
    } else {
      doc.text(line, lineX, lineY, { align: 'left' });
    }
  });
}

/**
 * Generates an invoice PDF completely client-side matching the Anand Professionals & Law Advisors template.
 * Fully supports Non-GST mode, IGST mode, and CGST+SGST mode with Service-wise Details and blank signature field.
 * @param {Object} invoiceData 
 * @returns {Promise<{ blob: Blob, url: string, fileName: string }>}
 */
export async function generateClientInvoicePdf(invoiceData) {
  const safeNumber = (invoiceData.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${safeNumber}.pdf`;

  // Standard A4 dimensions in pt: 595.28 x 841.89
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    orientation: 'portrait'
  });

  // --- Geometry & Constants ---
  const startX = 32;
  const totalWidth = 531;
  let currentY = 28;

  // Extract & Fallback data fields
  const companyTitle = 'ANAND PROFESSIONALS & LAW ADVISORS GST-TAX INVOICE';
  const companyAddress = 'B-102, HIDDEN TREASURE APARTMENTS, AYYAPPA SWAMY TEMPLE LANE, RAJBHAVAN ROAD, SOMAJIGUDA, HYDERABAD, TELANGANA STATE';
  const companyEmail = 'EMAIL - anand@apla.org.in';
  const companyGstin = '36AAPFA6515M1Z1';

  // Client Details
  const clientName = invoiceData.customerName || invoiceData.clientName || '';
  const clientAddress = invoiceData.customerAddress || invoiceData.clientAddress || '';
  const clientGstin = invoiceData.customerGstin || invoiceData.clientGstin || '';
  const placeOfSupply = invoiceData.placeOfSupply ?? '';
  const reverseCharge = invoiceData.reverseCharge ?? '';

  const invoiceNo = invoiceData.invoiceNumber ?? '';
  const invoiceDate = invoiceData.date ? formatInvoiceDate(invoiceData.date) : '';
  const poNumber = invoiceData.poNumber ?? '';
  const poDate = invoiceData.poDate ?? '';
  const grn = invoiceData.grn ?? '';

  const items = (invoiceData.items && invoiceData.items.length > 0) ? invoiceData.items : [];

  // Determine GST Settings:
  // If gstEnabled is explicitly false, GST is disabled.
  const gstEnabled = invoiceData.gstEnabled !== undefined 
    ? Boolean(invoiceData.gstEnabled)
    : (invoiceData.cgst > 0 || invoiceData.sgst > 0 || Number(invoiceData.igst || 0) > 0 || invoiceData.taxableAmount === undefined);

  const igstEnabled = gstEnabled && (invoiceData.igstEnabled !== undefined 
    ? Boolean(invoiceData.igstEnabled) 
    : (Number(invoiceData.igst || 0) > 0));

  const igstRateVal = Number(invoiceData.igstRate) > 0 ? Number(invoiceData.igstRate) : 18;

  const taxableAmount = invoiceData.taxableAmount !== undefined 
    ? Number(invoiceData.taxableAmount) 
    : items.reduce((acc, it) => acc + (parseFloat(it.cost) || 0), 0);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstEnabled) {
    if (igstEnabled) {
      igst = invoiceData.igst !== undefined 
        ? Number(invoiceData.igst) 
        : Number((taxableAmount * (igstRateVal / 100)).toFixed(2));
    } else {
      cgst = invoiceData.cgst !== undefined ? Number(invoiceData.cgst) : Number((taxableAmount * 0.09).toFixed(2));
      sgst = invoiceData.sgst !== undefined ? Number(invoiceData.sgst) : Number((taxableAmount * 0.09).toFixed(2));
    }
  }

  const totalAmount = invoiceData.totalAmount !== undefined 
    ? Number(invoiceData.totalAmount) 
    : Number((taxableAmount + cgst + sgst + igst).toFixed(2));

  const defaultRemarks = items[0]?.description?.toLowerCase().includes('retainer')
    ? `Towards Retainer fee for the Month of ${invoiceDate ? (new Date(invoiceData.date || Date.now()).toLocaleString('default', { month: 'long', year: 'numeric' })).toUpperCase() : 'APRIL 2026'}`
    : `Towards ${items[0]?.description || 'Professional Advisory Services'}`;
  const remarks = invoiceData.remarks || defaultRemarks;

  const wordsAmount = numberToWords(totalAmount);

  // ==========================================
  // SECTION 1: HEADER BOX (Company Details)
  // ==========================================
  const hRow1 = 18;
  const hRow2 = 17;
  const hRow3 = 15;

  drawBox(doc, startX, currentY, totalWidth, hRow1);
  drawText(doc, companyTitle, startX, currentY, totalWidth, hRow1, { bold: true, size: 10.5, align: 'center' });
  currentY += hRow1;

  drawBox(doc, startX, currentY, totalWidth, hRow2);
  drawText(doc, companyAddress, startX, currentY, totalWidth, hRow2, { bold: true, size: 7.2, align: 'center' });
  currentY += hRow2;

  drawBox(doc, startX, currentY, totalWidth, hRow3);
  drawText(doc, companyEmail, startX, currentY, totalWidth, hRow3, { bold: true, size: 8, align: 'center' });
  currentY += hRow3;

  // ==========================================
  // SECTION 2: CLIENT & INVOICE DETAILS
  // ==========================================
  const section2StartY = currentY;
  const leftColWidth = 323;
  const rightColWidth = totalWidth - leftColWidth; // 208
  const midDividerX = startX + leftColWidth; // 355
  const totalSec2H = 105;

  // Right Column: 5 rows (each 21pt) => Total height = 105pt
  const rightRowHeight = 21;
  const rightMetaX = midDividerX + 80;

  const metaRows = [
    { label: 'INVOICE NO :', val: invoiceNo },
    { label: 'DATE:', val: invoiceDate },
    { label: 'P O NO:', val: poNumber },
    { label: 'PO DATE:', val: poDate },
    { label: 'GRN:', val: grn }
  ];

  metaRows.forEach((row, i) => {
    const rY = section2StartY + i * rightRowHeight;
    drawBox(doc, midDividerX, rY, 80, rightRowHeight);
    drawText(doc, row.label, midDividerX, rY, 80, rightRowHeight, { bold: true, size: 7.5, align: 'left' });

    drawBox(doc, rightMetaX, rY, rightColWidth - 80, rightRowHeight);
    drawText(doc, row.val, rightMetaX, rY, rightColWidth - 80, rightRowHeight, { bold: true, size: 7.5, align: 'center' });
  });

  // Left Column:
  // Row A: Client Details & Address (Height 58pt)
  const custDetailsH = 58;
  drawBox(doc, startX, section2StartY, leftColWidth, custDetailsH);
  drawText(doc, 'Client Details:', startX, section2StartY + 1, leftColWidth, 12, { bold: true, size: 7.5, align: 'left', valign: 'top' });
  drawText(doc, 'Client Name:', startX, section2StartY + 13, 80, 12, { bold: true, size: 7, align: 'left', valign: 'top' });
  drawText(doc, clientName, startX + 75, section2StartY + 13, leftColWidth - 78, 12, { bold: true, size: 7.2, align: 'center', valign: 'top' });
  drawText(doc, 'Address:', startX, section2StartY + 25, 80, 12, { bold: true, size: 7, align: 'left', valign: 'top' });
  drawText(doc, clientAddress, startX + 75, section2StartY + 25, leftColWidth - 78, 30, { bold: true, size: 6.8, align: 'center', valign: 'top', lineGap: 0.5 });

  // Row B: Client GSTIN/ UID : (Height 19pt)
  const gstinY = section2StartY + custDetailsH;
  const gstinH = 19;
  drawBox(doc, startX, gstinY, leftColWidth, gstinH);
  drawText(doc, 'Client GSTIN/ UID :', startX, gstinY, 110, gstinH, { bold: true, size: 7.5, align: 'left' });
  drawText(doc, clientGstin, startX + 110, gstinY, leftColWidth - 110, gstinH, { bold: true, size: 8, align: 'center' });

  // Row C: Place of Supply & Reverse Charge (Height 28pt)
  const supplyY = gstinY + gstinH;
  const halfLeft = leftColWidth / 2; // 161.5

  // Left Half: Place of supply (stacked)
  drawBox(doc, startX, supplyY, halfLeft, 13);
  drawText(doc, 'Place of supply', startX, supplyY, halfLeft, 13, { bold: true, size: 7.5, align: 'center' });
  drawBox(doc, startX, supplyY + 13, halfLeft, 15);
  drawText(doc, placeOfSupply, startX, supplyY + 13, halfLeft, 15, { bold: true, size: 8, align: 'center' });

  // Right Half: Reverse Charge (stacked)
  drawBox(doc, startX + halfLeft, supplyY, halfLeft, 13);
  drawText(doc, 'Reverse Charge', startX + halfLeft, supplyY, halfLeft, 13, { bold: true, size: 7.5, align: 'center' });
  drawBox(doc, startX + halfLeft, supplyY + 13, halfLeft, 15);
  drawText(doc, reverseCharge, startX + halfLeft, supplyY + 13, halfLeft, 15, { bold: true, size: 8, align: 'center' });

  currentY = section2StartY + totalSec2H;

  // ==========================================
  // SECTION 3: SERVICE-WISE DETAILS BAR
  // ==========================================
  const prodBarH = 14;
  drawBox(doc, startX, currentY, totalWidth, prodBarH);
  drawText(doc, 'Service-wise Details:', startX, currentY, totalWidth, prodBarH, { bold: true, size: 8, align: 'left' });
  currentY += prodBarH;

  // ==========================================
  // SECTION 4: TABLE (NON-GST / IGST / CGST+SGST)
  // ==========================================
  const headerFill = '#EAEAEA';

  if (!gstEnabled) {
    // ------------------------------------------
    // CASE A: GST DISABLED (No GST columns at all)
    // ------------------------------------------
    const cols = [
      { key: 'sr', title: 'Sr. No.', w: 35 },
      { key: 'desc', title: 'Service Description', w: 336 },
      { key: 'sac', title: 'HSE/SAC Code', w: 70 },
      { key: 'charges', title: 'Service Charges', w: 90 }
    ];
    let curX = startX;
    cols.forEach(c => {
      c.x = curX;
      curX += c.w;
    });

    const tblH = 22;
    cols.forEach(c => {
      drawBox(doc, c.x, currentY, c.w, tblH, { fill: headerFill });
      drawText(doc, c.title, c.x, currentY, c.w, tblH, { bold: true, size: 7.5, align: 'center' });
    });
    currentY += tblH;

    // Body Item Rows
    items.forEach((item, index) => {
      const cost = parseFloat(item.cost) || 0;
      const itemRowH = 24;

      cols.forEach(c => drawBox(doc, c.x, currentY, c.w, itemRowH));
      drawText(doc, String(index + 1), cols[0].x, currentY, cols[0].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, item.description, cols[1].x, currentY, cols[1].w, itemRowH, { bold: true, size: 7.2, align: 'left', lineGap: 0.8 });
      drawText(doc, item.hseSacCode || '998311', cols[2].x, currentY, cols[2].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, formatIndianNumber(cost), cols[3].x, currentY, cols[3].w, itemRowH, { size: 7.5, align: 'right' });

      currentY += itemRowH;
    });

    // Filler Rows if fewer than 3 items
    const fillerCount = Math.max(0, 3 - items.length);
    for (let f = 0; f < fillerCount; f++) {
      const fillerH = 16;
      cols.forEach(c => {
        drawBox(doc, c.x, currentY, c.w, fillerH);
        drawText(doc, '-', c.x, currentY, c.w, fillerH, { size: 7.5, align: 'center' });
      });
      currentY += fillerH;
    }

    // Total Row
    const totalRowH = 16;
    const preW = cols[0].w + cols[1].w + cols[2].w; // 441
    drawBox(doc, startX, currentY, preW, totalRowH);
    drawText(doc, 'Total', startX, currentY, preW, totalRowH, { bold: true, size: 7.5, align: 'center' });

    drawBox(doc, cols[3].x, currentY, cols[3].w, totalRowH);
    drawText(doc, formatIndianNumber(taxableAmount), cols[3].x, currentY, cols[3].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

    currentY += totalRowH;

  } else if (igstEnabled) {
    // ------------------------------------------
    // CASE B: IGST ENABLED (Inter-state)
    // ------------------------------------------
    const cols = [
      { key: 'sr', title: 'Sr. No.', w: 30 },
      { key: 'desc', title: 'Service Description', w: 261 },
      { key: 'sac', title: 'HSE/SAC Code', w: 65 },
      { key: 'charges', title: 'Service Charges', w: 75 },
      { key: 'igstRate', title: 'Rate %', w: 45 },
      { key: 'igstAmt', title: 'Amount', w: 55 }
    ];
    let curX = startX;
    cols.forEach(c => {
      c.x = curX;
      curX += c.w;
    });

    const tblHeaderH1 = 15;
    const tblHeaderH2 = 14;
    const totalHeaderH = tblHeaderH1 + tblHeaderH2;

    for (let i = 0; i < 4; i++) {
      drawBox(doc, cols[i].x, currentY, cols[i].w, totalHeaderH, { fill: headerFill });
      drawText(doc, cols[i].title, cols[i].x, currentY, cols[i].w, totalHeaderH, { bold: true, size: 7.2, align: 'center' });
    }

    // IGST header row 1
    const igstW = cols[4].w + cols[5].w;
    drawBox(doc, cols[4].x, currentY, igstW, tblHeaderH1, { fill: headerFill });
    drawText(doc, 'IGST', cols[4].x, currentY, igstW, tblHeaderH1, { bold: true, size: 7.5, align: 'center' });

    // IGST subheaders row 2
    drawBox(doc, cols[4].x, currentY + tblHeaderH1, cols[4].w, tblHeaderH2, { fill: headerFill });
    drawText(doc, 'Rate %', cols[4].x, currentY + tblHeaderH1, cols[4].w, tblHeaderH2, { bold: true, size: 6.5, align: 'center' });

    drawBox(doc, cols[5].x, currentY + tblHeaderH1, cols[5].w, tblHeaderH2, { fill: headerFill });
    drawText(doc, 'Amount', cols[5].x, currentY + tblHeaderH1, cols[5].w, tblHeaderH2, { bold: true, size: 6.5, align: 'center' });

    currentY += totalHeaderH;

    // Body Item Rows
    items.forEach((item, index) => {
      const cost = parseFloat(item.cost) || 0;
      const lineIgst = Number((cost * (igstRateVal / 100)).toFixed(2));
      const itemRowH = 24;

      cols.forEach(c => drawBox(doc, c.x, currentY, c.w, itemRowH));
      drawText(doc, String(index + 1), cols[0].x, currentY, cols[0].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, item.description, cols[1].x, currentY, cols[1].w, itemRowH, { bold: true, size: 7.0, align: 'left', lineGap: 0.8 });
      drawText(doc, item.hseSacCode || '998311', cols[2].x, currentY, cols[2].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, formatIndianNumber(cost), cols[3].x, currentY, cols[3].w, itemRowH, { size: 7.5, align: 'right' });
      drawText(doc, `${igstRateVal}%`, cols[4].x, currentY, cols[4].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, formatIndianNumber(lineIgst), cols[5].x, currentY, cols[5].w, itemRowH, { size: 7.5, align: 'right' });

      currentY += itemRowH;
    });

    // Filler Rows
    const fillerCount = Math.max(0, 3 - items.length);
    for (let f = 0; f < fillerCount; f++) {
      const fillerH = 16;
      cols.forEach(c => {
        drawBox(doc, c.x, currentY, c.w, fillerH);
        drawText(doc, '-', c.x, currentY, c.w, fillerH, { size: 7.5, align: 'center' });
      });
      currentY += fillerH;
    }

    // Total Row
    const totalRowH = 16;
    const preW = cols[0].w + cols[1].w + cols[2].w; // 356
    drawBox(doc, startX, currentY, preW, totalRowH);
    drawText(doc, 'Total', startX, currentY, preW, totalRowH, { bold: true, size: 7.5, align: 'center' });

    drawBox(doc, cols[3].x, currentY, cols[3].w, totalRowH);
    drawText(doc, formatIndianNumber(taxableAmount), cols[3].x, currentY, cols[3].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

    drawBox(doc, cols[4].x, currentY, cols[4].w, totalRowH);
    drawText(doc, '-', cols[4].x, currentY, cols[4].w, totalRowH, { size: 7.5, align: 'center' });

    drawBox(doc, cols[5].x, currentY, cols[5].w, totalRowH);
    drawText(doc, formatIndianNumber(igst), cols[5].x, currentY, cols[5].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

    currentY += totalRowH;

  } else {
    // ------------------------------------------
    // CASE C: CGST + SGST ENABLED (Intra-state)
    // ------------------------------------------
    const cols = [
      { key: 'sr', title: 'Sr. No.', w: 28 },
      { key: 'desc', title: 'Service Description', w: 213 },
      { key: 'sac', title: 'HSE/SAC Code', w: 60 },
      { key: 'charges', title: 'Service Charges', w: 70 },
      { key: 'cgstRate', title: 'Rate %', w: 35 },
      { key: 'cgstAmt', title: 'Amount', w: 45 },
      { key: 'sgstRate', title: 'Rate %', w: 35 },
      { key: 'sgstAmt', title: 'Amount', w: 45 }
    ];
    let curX = startX;
    cols.forEach(c => {
      c.x = curX;
      curX += c.w;
    });

    const tblHeaderH1 = 15;
    const tblHeaderH2 = 14;
    const totalHeaderH = tblHeaderH1 + tblHeaderH2;

    for (let i = 0; i < 4; i++) {
      drawBox(doc, cols[i].x, currentY, cols[i].w, totalHeaderH, { fill: headerFill });
      drawText(doc, cols[i].title, cols[i].x, currentY, cols[i].w, totalHeaderH, { bold: true, size: 7.2, align: 'center' });
    }

    // CGST
    const cgstW = cols[4].w + cols[5].w;
    drawBox(doc, cols[4].x, currentY, cgstW, tblHeaderH1, { fill: headerFill });
    drawText(doc, 'CGST', cols[4].x, currentY, cgstW, tblHeaderH1, { bold: true, size: 7.5, align: 'center' });
    drawBox(doc, cols[4].x, currentY + tblHeaderH1, cols[4].w, tblHeaderH2, { fill: headerFill });
    drawText(doc, 'Rate %', cols[4].x, currentY + tblHeaderH1, cols[4].w, tblHeaderH2, { bold: true, size: 6.5, align: 'center' });
    drawBox(doc, cols[5].x, currentY + tblHeaderH1, cols[5].w, tblHeaderH2, { fill: headerFill });
    drawText(doc, 'Amount', cols[5].x, currentY + tblHeaderH1, cols[5].w, tblHeaderH2, { bold: true, size: 6.5, align: 'center' });

    // SGST
    const sgstW = cols[6].w + cols[7].w;
    drawBox(doc, cols[6].x, currentY, sgstW, tblHeaderH1, { fill: headerFill });
    drawText(doc, 'SGST', cols[6].x, currentY, sgstW, tblHeaderH1, { bold: true, size: 7.5, align: 'center' });
    drawBox(doc, cols[6].x, currentY + tblHeaderH1, cols[6].w, tblHeaderH2, { fill: headerFill });
    drawText(doc, 'Rate %', cols[6].x, currentY + tblHeaderH1, cols[6].w, tblHeaderH2, { bold: true, size: 6.5, align: 'center' });
    drawBox(doc, cols[7].x, currentY + tblHeaderH1, cols[7].w, tblHeaderH2, { fill: headerFill });
    drawText(doc, 'Amount', cols[7].x, currentY + tblHeaderH1, cols[7].w, tblHeaderH2, { bold: true, size: 6.5, align: 'center' });

    currentY += totalHeaderH;

    // Body Item Rows
    items.forEach((item, index) => {
      const cost = parseFloat(item.cost) || 0;
      const lineCgst = Number((cost * 0.09).toFixed(2));
      const lineSgst = Number((cost * 0.09).toFixed(2));
      const itemRowH = 24;

      cols.forEach(c => drawBox(doc, c.x, currentY, c.w, itemRowH));
      drawText(doc, String(index + 1), cols[0].x, currentY, cols[0].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, item.description, cols[1].x, currentY, cols[1].w, itemRowH, { bold: true, size: 6.8, align: 'left', lineGap: 0.8 });
      drawText(doc, item.hseSacCode || '998311', cols[2].x, currentY, cols[2].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, formatIndianNumber(cost), cols[3].x, currentY, cols[3].w, itemRowH, { size: 7.5, align: 'right' });
      drawText(doc, '9%', cols[4].x, currentY, cols[4].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, formatIndianNumber(lineCgst), cols[5].x, currentY, cols[5].w, itemRowH, { size: 7.5, align: 'right' });
      drawText(doc, '9%', cols[6].x, currentY, cols[6].w, itemRowH, { size: 7.5, align: 'center' });
      drawText(doc, formatIndianNumber(lineSgst), cols[7].x, currentY, cols[7].w, itemRowH, { size: 7.5, align: 'right' });

      currentY += itemRowH;
    });

    // Filler Rows
    const fillerCount = Math.max(0, 3 - items.length);
    for (let f = 0; f < fillerCount; f++) {
      const fillerH = 16;
      cols.forEach(c => {
        drawBox(doc, c.x, currentY, c.w, fillerH);
        drawText(doc, '-', c.x, currentY, c.w, fillerH, { size: 7.5, align: 'center' });
      });
      currentY += fillerH;
    }

    // Total Row
    const totalRowH = 16;
    const preW = cols[0].w + cols[1].w + cols[2].w; // 301
    drawBox(doc, startX, currentY, preW, totalRowH);
    drawText(doc, 'Total', startX, currentY, preW, totalRowH, { bold: true, size: 7.5, align: 'center' });

    drawBox(doc, cols[3].x, currentY, cols[3].w, totalRowH);
    drawText(doc, formatIndianNumber(taxableAmount), cols[3].x, currentY, cols[3].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

    drawBox(doc, cols[4].x, currentY, cols[4].w, totalRowH);
    drawText(doc, '-', cols[4].x, currentY, cols[4].w, totalRowH, { size: 7.5, align: 'center' });

    drawBox(doc, cols[5].x, currentY, cols[5].w, totalRowH);
    drawText(doc, formatIndianNumber(cgst), cols[5].x, currentY, cols[5].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

    drawBox(doc, cols[6].x, currentY, cols[6].w, totalRowH);
    drawText(doc, '-', cols[6].x, currentY, cols[6].w, totalRowH, { size: 7.5, align: 'center' });

    drawBox(doc, cols[7].x, currentY, cols[7].w, totalRowH);
    drawText(doc, formatIndianNumber(sgst), cols[7].x, currentY, cols[7].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

    currentY += totalRowH;
  }

  // ==========================================
  // SECTION 5: REMARKS & SUMMARY
  // ==========================================
  const sec5StartY = currentY;
  const remarksW = 333;
  const summaryW = totalWidth - remarksW; // 198
  const summarySplitX = startX + remarksW; // 365

  // Summary Rows dynamically constructed
  let summaryRows = [];
  if (!gstEnabled) {
    summaryRows = [
      { label: 'Total Invoice Value', val: formatIndianNumber(taxableAmount), bold: false },
      { label: 'Online Charges', val: '-', bold: false },
      { label: 'Total Discounts', val: '-', bold: false },
      { label: 'Grand Total', val: formatIndianNumber(totalAmount), bold: true }
    ];
  } else if (igstEnabled) {
    summaryRows = [
      { label: 'Total Invoice Value', val: formatIndianNumber(taxableAmount), bold: false },
      { label: 'Online Charges', val: '-', bold: false },
      { label: 'Total Discounts', val: '-', bold: false },
      { label: 'Total Taxable Value', val: formatIndianNumber(taxableAmount), bold: false },
      { label: `Total IGST (${igstRateVal}%)`, val: formatIndianNumber(igst), bold: false },
      { label: 'Grand Total', val: formatIndianNumber(totalAmount), bold: true }
    ];
  } else {
    summaryRows = [
      { label: 'Total Invoice Value', val: formatIndianNumber(taxableAmount), bold: false },
      { label: 'Online Charges', val: '-', bold: false },
      { label: 'Total Discounts', val: '-', bold: false },
      { label: 'Total Taxable Value', val: formatIndianNumber(taxableAmount), bold: false },
      { label: 'Total CGST (9%)', val: formatIndianNumber(cgst), bold: false },
      { label: 'Total SGST (9%)', val: formatIndianNumber(sgst), bold: false },
      { label: 'Grand Total', val: formatIndianNumber(totalAmount), bold: true }
    ];
  }

  const sRowH = 13.5;
  const summaryHeaderH = 14;
  const sec5TotalH = summaryHeaderH + summaryRows.length * sRowH;

  // Left: Remarks Box
  drawBox(doc, startX, sec5StartY, remarksW, 14);
  drawText(doc, 'Remarks:', startX, sec5StartY, remarksW, 14, { bold: true, size: 7.5, align: 'left' });

  drawBox(doc, startX, sec5StartY + 14, remarksW, sec5TotalH - 14);
  drawText(doc, remarks, startX, sec5StartY + 14, remarksW, sec5TotalH - 14, { bold: true, size: 7.2, align: 'center' });

  // Right: Summary Table
  const summaryAmtW = 68;
  const summaryLblW = summaryW - summaryAmtW;
  const sAmtX = summarySplitX + summaryLblW;

  drawBox(doc, summarySplitX, sec5StartY, summaryLblW, summaryHeaderH, { fill: headerFill });
  drawText(doc, 'Summary', summarySplitX, sec5StartY, summaryLblW, summaryHeaderH, { bold: true, size: 7.5, align: 'center' });

  drawBox(doc, sAmtX, sec5StartY, summaryAmtW, summaryHeaderH, { fill: headerFill });
  drawText(doc, 'Amount', sAmtX, sec5StartY, summaryAmtW, summaryHeaderH, { bold: true, size: 7.5, align: 'center' });

  summaryRows.forEach((sr, idx) => {
    const rY = sec5StartY + summaryHeaderH + idx * sRowH;
    drawBox(doc, summarySplitX, rY, summaryLblW, sRowH);
    drawText(doc, sr.label, summarySplitX, rY, summaryLblW, sRowH, { bold: sr.bold, size: 7.2, align: 'right' });

    drawBox(doc, sAmtX, rY, summaryAmtW, sRowH);
    drawText(doc, sr.val, sAmtX, rY, summaryAmtW, sRowH, { bold: sr.bold, size: 7.2, align: 'right' });
  });

  currentY = sec5StartY + sec5TotalH;

  // ==========================================
  // SECTION 6: TOTAL AMOUNT IN WORDS
  // ==========================================
  const wordsH = 17;
  const wordsLabelW = 110;
  drawBox(doc, startX, currentY, wordsLabelW, wordsH);
  drawText(doc, 'Total Amount (In words) :', startX, currentY, wordsLabelW, wordsH, { bold: true, size: 7.5, align: 'left' });

  drawBox(doc, startX + wordsLabelW, currentY, totalWidth - wordsLabelW, wordsH);
  drawText(doc, wordsAmount, startX + wordsLabelW, currentY, totalWidth - wordsLabelW, wordsH, { bold: true, size: 8, align: 'center' });
  currentY += wordsH;

  // ==========================================
  // SECTION 7: GSTIN & COMPANY BANNER
  // ==========================================
  const gstinBannerH = 16;
  const bannerSplitX = startX + 335;

  drawBox(doc, startX, currentY, 335, gstinBannerH);
  drawText(doc, `GSTIN:  ${companyGstin}`, startX, currentY, 335, gstinBannerH, { bold: true, size: 8, align: 'left' });

  drawBox(doc, bannerSplitX, currentY, totalWidth - 335, gstinBannerH);
  drawText(doc, 'ANAND PROFESSIONALS & LAW ADVISORS', bannerSplitX, currentY, totalWidth - 335, gstinBannerH, { bold: true, size: 7.8, align: 'center' });
  currentY += gstinBannerH;

  // ==========================================
  // SECTION 8: DECLARATION & SIGNATURE
  // Digital signature field is left completely blank as requested
  // ==========================================
  const declH = 64;
  const declSplitX = startX + 335;

  drawBox(doc, startX, currentY, 335, declH);
  drawText(doc, 'Declaration', startX, currentY + 3, 335, 12, { bold: true, size: 7.5, align: 'center', valign: 'top' });
  drawText(doc, 'we declare that this invoice raised is Correct and that all particulars given are True', startX, currentY + 16, 335, 12, { size: 6.8, align: 'center', valign: 'top' });
  drawText(doc, "Client's Seal and Signature", startX, currentY, 335, declH, { size: 7.5, align: 'left', valign: 'bottom' });

  // Signature box on the right: signature area is left blank, only Authorised Signatory label at the bottom
  drawBox(doc, declSplitX, currentY, totalWidth - 335, declH);
  drawText(doc, 'Authorised Signatory', declSplitX, currentY, totalWidth - 335, declH, { bold: true, size: 7.5, align: 'center', valign: 'bottom' });

  currentY += declH;

  // ==========================================
  // SECTION 9: BANK DETAILS
  // ==========================================
  const bankH = 34;
  drawBox(doc, startX, currentY, totalWidth, bankH);
  drawText(doc, 'Note: Make all cheques payable to Company Name', startX, currentY + 3, totalWidth, 9, { bold: true, size: 7, align: 'left', valign: 'top' });
  drawText(doc, 'Bank: State Bank of India     Branch: Bellavista', startX, currentY + 13, totalWidth, 9, { bold: true, size: 7, align: 'left', valign: 'top' });
  drawText(doc, 'Account No: 36413276577       IFSC Code: SBIN0020063', startX, currentY + 23, totalWidth, 9, { bold: true, size: 7, align: 'left', valign: 'top' });
  currentY += bankH;

  // ==========================================
  // SECTION 10: JURISDICTION (FOOTER)
  // ==========================================
  currentY += 6;
  drawText(doc, 'SUBJECT TO HYDERABAD JURISDICTION', startX, currentY, totalWidth, 12, { bold: true, size: 7.5, align: 'center' });

  const blob = doc.output('blob');
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '';

  return { blob, url, fileName };
}
