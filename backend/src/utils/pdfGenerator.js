import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { formatIndianNumber, formatInvoiceDate, numberToWords, getDigitalSignatureTimestamp } from './formatters.js';

/**
 * Draws a rectangle with fill and stroke options.
 */
function drawBox(doc, x, y, w, h, { fill = null, stroke = '#000000', lineWidth = 0.5 } = {}) {
  if (fill) {
    doc.rect(x, y, w, h).fillColor(fill).fill();
  }
  if (stroke) {
    doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(lineWidth).stroke();
  }
}

/**
 * Draws positioned text with horizontal and vertical alignment within a bounding box.
 */
function drawText(doc, text, x, y, w, h, {
  font = 'Helvetica',
  size = 7.5,
  color = '#000000',
  align = 'center',
  valign = 'middle',
  bold = false,
  lineGap = 0
} = {}) {
  if (text === undefined || text === null || text === '') return;
  const str = String(text);
  doc.font(bold ? 'Helvetica-Bold' : font)
     .fontSize(size)
     .fillColor(color);

  const textHeight = doc.heightOfString(str, { width: Math.max(10, w - 6), lineGap });
  let textY = y + 2;
  if (valign === 'middle') {
    textY = y + Math.max(0, (h - textHeight) / 2);
  } else if (valign === 'bottom') {
    textY = y + Math.max(0, h - textHeight - 2);
  } else if (valign === 'top') {
    textY = y + 2;
  }

  doc.text(str, x + 3, textY, {
    width: Math.max(10, w - 6),
    align: align,
    lineGap: lineGap,
    lineBreak: true
  });
}

/**
 * Generates an invoice PDF using pdfkit matching the Anand Professionals & Law Advisors template exactly.
 * @param {Object} invoiceData 
 * @param {string} outputDir 
 * @returns {Promise<string>} file name
 */
export async function generateInvoicePdf(invoiceData, outputDir) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const safeNumber = invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
      const fileName = `${safeNumber}.pdf`;
      const filePath = path.join(outputDir, fileName);

      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // --- Geometry & Constants ---
      const startX = 32;
      const totalWidth = 531;
      let currentY = 28;

      // Extract & Fallback data fields
      const companyTitle = 'ANAND PROFESSIONALS & LAW ADVISORS GST-TAX INVOICE';
      const companyAddress = 'B-102, HIDDEN TREASURE APARTMENTS, AYYAPPA SWAMY TEMPLE LANE, RAJBHAVAN ROAD, SOMAJIGUDA, HYDERABAD, TELANGANA STATE';
      const companyEmail = 'EMAIL - anand@apla.org.in';
      const companyGstin = '36AAPFA6515M1Z1';

      const customerName = invoiceData.customerName ?? '';
      const customerAddress = invoiceData.customerAddress ?? '';
      const customerGstin = invoiceData.customerGstin ?? '';
      const placeOfSupply = invoiceData.placeOfSupply ?? '';
      const reverseCharge = invoiceData.reverseCharge ?? '';

      const invoiceNo = invoiceData.invoiceNumber ?? '';
      const invoiceDate = invoiceData.date ? formatInvoiceDate(invoiceData.date) : '';
      const poNumber = invoiceData.poNumber ?? '';
      const poDate = invoiceData.poDate ?? '';
      const grn = invoiceData.grn ?? '';

      const items = (invoiceData.items && invoiceData.items.length > 0) ? invoiceData.items : [];

      const taxableAmount = invoiceData.taxableAmount !== undefined ? invoiceData.taxableAmount : items.reduce((acc, it) => acc + (parseFloat(it.cost) || 0), 0);
      const cgst = invoiceData.cgst !== undefined ? invoiceData.cgst : Number((taxableAmount * 0.09).toFixed(2));
      const sgst = invoiceData.sgst !== undefined ? invoiceData.sgst : Number((taxableAmount * 0.09).toFixed(2));
      const totalAmount = invoiceData.totalAmount !== undefined ? invoiceData.totalAmount : Number((taxableAmount + cgst + sgst).toFixed(2));

      const defaultRemarks = items[0]?.description?.toLowerCase().includes('retainer')
        ? `Towards Retainer fee for the Month of ${invoiceDate ? (new Date(invoiceData.date || Date.now()).toLocaleString('default', { month: 'long', year: 'numeric' })).toUpperCase() : 'APRIL 2026'}`
        : `Towards ${items[0]?.description || 'Professional Services'}`;
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
      // SECTION 2: CUSTOMER & INVOICE DETAILS
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
      // Row A: Customer Details & Address (Height 58pt)
      const custDetailsH = 58;
      drawBox(doc, startX, section2StartY, leftColWidth, custDetailsH);
      drawText(doc, 'Customer Details:', startX, section2StartY + 1, leftColWidth, 12, { bold: true, size: 7.5, align: 'left', valign: 'top' });
      drawText(doc, 'Customer Name:', startX, section2StartY + 13, 80, 12, { bold: true, size: 7, align: 'left', valign: 'top' });
      drawText(doc, customerName, startX + 75, section2StartY + 13, leftColWidth - 78, 12, { bold: true, size: 7.2, align: 'center', valign: 'top' });
      drawText(doc, 'Address:', startX, section2StartY + 25, 80, 12, { bold: true, size: 7, align: 'left', valign: 'top' });
      drawText(doc, customerAddress, startX + 75, section2StartY + 25, leftColWidth - 78, 30, { bold: true, size: 6.8, align: 'center', valign: 'top', lineGap: 0.5 });

      // Row B: Customer GSTIN/ UID : (Height 19pt)
      const gstinY = section2StartY + custDetailsH;
      const gstinH = 19;
      drawBox(doc, startX, gstinY, leftColWidth, gstinH);
      drawText(doc, 'Customer GSTIN/ UID :', startX, gstinY, 110, gstinH, { bold: true, size: 7.5, align: 'left' });
      drawText(doc, customerGstin, startX + 110, gstinY, leftColWidth - 110, gstinH, { bold: true, size: 8, align: 'center' });

      // Row C: Place of Supply & Reverse Charge (Height 28pt)
      const supplyY = gstinY + gstinH;
      const supplyH = 28;
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
      // SECTION 3: PRODUCT-WISE DETAILS BAR
      // ==========================================
      const prodBarH = 14;
      drawBox(doc, startX, currentY, totalWidth, prodBarH);
      drawText(doc, 'Product-wise Details:', startX, currentY, totalWidth, prodBarH, { bold: true, size: 8, align: 'left' });
      currentY += prodBarH;

      // ==========================================
      // SECTION 4: PRODUCT-WISE TABLE
      // ==========================================
      // Perfectly calibrated column widths:
      // Col 0: Sr. No. (24)
      // Col 1: Product Description (100)
      // Col 2: HSE/SAC Code (42)
      // Col 3: Qty (20)
      // Col 4: Unit (20)
      // Col 5: Rate (40)
      // Col 6: Total Sale (42)
      // Col 7: Disc. (25)
      // Col 8: Taxable Value (42)
      // Col 9: CGST Rate% (26)
      // Col 10: CGST Amt (34)
      // Col 11: SGST Rate% (26)
      // Col 12: SGST Amt (34)
      // Col 13: IGST Rate% (26)
      // Col 14: IGST Amt (30)
      // Total = 24+100+42+20+20+40+42+25+42+26+34+26+34+26+30 = 531!

      const colDefs = [
        { key: 'sr', w: 24 },
        { key: 'desc', w: 100 },
        { key: 'sac', w: 42 },
        { key: 'qty', w: 20 },
        { key: 'unit', w: 20 },
        { key: 'rate', w: 40 },
        { key: 'totalSale', w: 42 },
        { key: 'disc', w: 25 },
        { key: 'taxVal', w: 42 },
        { key: 'cgstRate', w: 26 },
        { key: 'cgstAmt', w: 34 },
        { key: 'sgstRate', w: 26 },
        { key: 'sgstAmt', w: 34 },
        { key: 'igstRate', w: 26 },
        { key: 'igstAmt', w: 30 }
      ];

      // Calculate col X offsets
      let cumX = startX;
      colDefs.forEach(col => {
        col.x = cumX;
        cumX += col.w;
      });

      const headerFill = '#EAEAEA';
      const tblHeaderH1 = 15;
      const tblHeaderH2 = 14;
      const totalTblHeaderH = tblHeaderH1 + tblHeaderH2;

      // Table Main Headers (Row 1 & 2 merged for standard columns)
      const spanCols = [
        { idx: 0, title: 'Sr. No.' },
        { idx: 1, title: 'Product Description' },
        { idx: 2, title: 'HSE/SAC\nCode' },
        { idx: 3, title: 'Qty' },
        { idx: 4, title: 'Unit' },
        { idx: 5, title: 'Rate' },
        { idx: 6, title: 'Total Sale' },
        { idx: 7, title: 'Disc.' },
        { idx: 8, title: 'Taxable\nValue' }
      ];

      spanCols.forEach(c => {
        const col = colDefs[c.idx];
        drawBox(doc, col.x, currentY, col.w, totalTblHeaderH, { fill: headerFill });
        drawText(doc, c.title, col.x, currentY, col.w, totalTblHeaderH, { bold: true, size: 6.8, align: 'center', lineGap: 0.5 });
      });

      // Split Headers: CGST, SGST, IGST in Row 1
      const taxHeaderDefs = [
        { startIdx: 9, title: 'CGST', w: colDefs[9].w + colDefs[10].w },
        { startIdx: 11, title: 'SGST', w: colDefs[11].w + colDefs[12].w },
        { startIdx: 13, title: 'IGST', w: colDefs[13].w + colDefs[14].w }
      ];

      taxHeaderDefs.forEach(th => {
        const x = colDefs[th.startIdx].x;
        drawBox(doc, x, currentY, th.w, tblHeaderH1, { fill: headerFill });
        drawText(doc, th.title, x, currentY, th.w, tblHeaderH1, { bold: true, size: 7.5, align: 'center' });
      });

      // Subheaders in Row 2: Rate % | Amount
      const subHeaderRowY = currentY + tblHeaderH1;
      [9, 11, 13].forEach(idx => {
        const rateCol = colDefs[idx];
        const amtCol = colDefs[idx + 1];

        drawBox(doc, rateCol.x, subHeaderRowY, rateCol.w, tblHeaderH2, { fill: headerFill });
        drawText(doc, 'Rate %', rateCol.x, subHeaderRowY, rateCol.w, tblHeaderH2, { bold: true, size: 6.0, align: 'center' });

        drawBox(doc, amtCol.x, subHeaderRowY, amtCol.w, tblHeaderH2, { fill: headerFill });
        drawText(doc, 'Amount', amtCol.x, subHeaderRowY, amtCol.w, tblHeaderH2, { bold: true, size: 6.0, align: 'center' });
      });

      currentY += totalTblHeaderH;

      // --- Body Item Rows ---
      items.forEach((item, index) => {
        const cost = parseFloat(item.cost) || 0;
        const itemRowH = 24;

        colDefs.forEach(col => {
          drawBox(doc, col.x, currentY, col.w, itemRowH);
        });

        // 0: Sr No
        drawText(doc, String(index + 1), colDefs[0].x, currentY, colDefs[0].w, itemRowH, { size: 7.5, align: 'center' });
        // 1: Description
        drawText(doc, item.description, colDefs[1].x, currentY, colDefs[1].w, itemRowH, { bold: true, size: 6.8, align: 'center', lineGap: 0.8 });
        // 2: SAC
        drawText(doc, item.hseSacCode || '998311', colDefs[2].x, currentY, colDefs[2].w, itemRowH, { size: 7.5, align: 'center' });
        // 3: Qty
        drawText(doc, item.qty || '1', colDefs[3].x, currentY, colDefs[3].w, itemRowH, { size: 7.5, align: 'center' });
        // 4: Unit
        drawText(doc, item.unit || '-', colDefs[4].x, currentY, colDefs[4].w, itemRowH, { size: 7.5, align: 'center' });
        // 5: Rate
        drawText(doc, formatIndianNumber(cost), colDefs[5].x, currentY, colDefs[5].w, itemRowH, { size: 7.5, align: 'right' });
        // 6: Total Sale
        drawText(doc, formatIndianNumber(cost), colDefs[6].x, currentY, colDefs[6].w, itemRowH, { size: 7.5, align: 'right' });
        // 7: Disc
        drawText(doc, item.disc || '-', colDefs[7].x, currentY, colDefs[7].w, itemRowH, { size: 7.5, align: 'center' });
        // 8: Taxable Value
        drawText(doc, formatIndianNumber(cost), colDefs[8].x, currentY, colDefs[8].w, itemRowH, { size: 7.5, align: 'right' });
        // 9: CGST Rate%
        drawText(doc, '9%', colDefs[9].x, currentY, colDefs[9].w, itemRowH, { size: 7.5, align: 'center' });
        // 10: CGST Amt
        drawText(doc, formatIndianNumber(cost * 0.09), colDefs[10].x, currentY, colDefs[10].w, itemRowH, { size: 7.5, align: 'right' });
        // 11: SGST Rate%
        drawText(doc, '9%', colDefs[11].x, currentY, colDefs[11].w, itemRowH, { size: 7.5, align: 'center' });
        // 12: SGST Amt
        drawText(doc, formatIndianNumber(cost * 0.09), colDefs[12].x, currentY, colDefs[12].w, itemRowH, { size: 7.5, align: 'right' });
        // 13: IGST Rate%
        drawText(doc, '0%', colDefs[13].x, currentY, colDefs[13].w, itemRowH, { size: 7.5, align: 'center' });
        // 14: IGST Amt
        drawText(doc, '-', colDefs[14].x, currentY, colDefs[14].w, itemRowH, { size: 7.5, align: 'center' });

        currentY += itemRowH;
      });

      // Placeholder rows if fewer than 3 items
      const fillerRowsCount = Math.max(0, 3 - items.length);
      for (let f = 0; f < fillerRowsCount; f++) {
        const fillerH = 15;
        colDefs.forEach(col => {
          drawBox(doc, col.x, currentY, col.w, fillerH);
          drawText(doc, '-', col.x, currentY, col.w, fillerH, { size: 7.5, align: 'center' });
        });
        currentY += fillerH;
      }

      // --- Total Row ---
      const totalRowH = 16;
      // Merge Sr. No. to Unit (Cols 0 through 4)
      const preTotalW = colDefs[0].w + colDefs[1].w + colDefs[2].w + colDefs[3].w + colDefs[4].w; // 206
      drawBox(doc, startX, currentY, preTotalW, totalRowH);

      // Col 5: Rate cell holds "Total" label
      drawBox(doc, colDefs[5].x, currentY, colDefs[5].w, totalRowH);
      drawText(doc, 'Total', colDefs[5].x, currentY, colDefs[5].w, totalRowH, { bold: true, size: 7.5, align: 'center' });

      // Col 6: Total Sale
      drawBox(doc, colDefs[6].x, currentY, colDefs[6].w, totalRowH);
      drawText(doc, formatIndianNumber(taxableAmount), colDefs[6].x, currentY, colDefs[6].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

      // Col 7: Disc
      drawBox(doc, colDefs[7].x, currentY, colDefs[7].w, totalRowH);
      drawText(doc, '-', colDefs[7].x, currentY, colDefs[7].w, totalRowH, { size: 7.5, align: 'center' });

      // Col 8: Taxable Value
      drawBox(doc, colDefs[8].x, currentY, colDefs[8].w, totalRowH);
      drawText(doc, formatIndianNumber(taxableAmount), colDefs[8].x, currentY, colDefs[8].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

      // Col 9: CGST Rate% (blank in reference)
      drawBox(doc, colDefs[9].x, currentY, colDefs[9].w, totalRowH);

      // Col 10: CGST Amt
      drawBox(doc, colDefs[10].x, currentY, colDefs[10].w, totalRowH);
      drawText(doc, formatIndianNumber(cgst), colDefs[10].x, currentY, colDefs[10].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

      // Col 11: SGST Rate% (blank in reference)
      drawBox(doc, colDefs[11].x, currentY, colDefs[11].w, totalRowH);

      // Col 12: SGST Amt
      drawBox(doc, colDefs[12].x, currentY, colDefs[12].w, totalRowH);
      drawText(doc, formatIndianNumber(sgst), colDefs[12].x, currentY, colDefs[12].w, totalRowH, { bold: true, size: 7.5, align: 'right' });

      // Col 13: IGST Rate% (blank in reference)
      drawBox(doc, colDefs[13].x, currentY, colDefs[13].w, totalRowH);

      // Col 14: IGST Amt
      drawBox(doc, colDefs[14].x, currentY, colDefs[14].w, totalRowH);
      drawText(doc, '-', colDefs[14].x, currentY, colDefs[14].w, totalRowH, { size: 7.5, align: 'center' });

      currentY += totalRowH;

      // ==========================================
      // SECTION 5: REMARKS & SUMMARY
      // ==========================================
      const sec5StartY = currentY;
      // Remarks width aligns with Taxable Value (Col 8.x)
      const remarksW = colDefs[8].x - startX; // 333
      const summaryW = totalWidth - remarksW; // 198
      const summarySplitX = colDefs[8].x; // 365

      const summaryRows = [
        { label: 'Total Invoice Value', val: formatIndianNumber(taxableAmount), bold: false },
        { label: 'Online Charges', val: '-', bold: false },
        { label: 'Total Discounts', val: '-', bold: false },
        { label: 'Total Taxable Value', val: formatIndianNumber(taxableAmount), bold: false },
        { label: 'Total CGST', val: formatIndianNumber(cgst), bold: false },
        { label: 'Total SGST', val: formatIndianNumber(sgst), bold: false },
        { label: 'Total IGST', val: '-', bold: false },
        { label: 'Grand Total', val: formatIndianNumber(totalAmount), bold: true }
      ];

      const sRowH = 13.5;
      const summaryHeaderH = 14;
      const sec5TotalH = summaryHeaderH + summaryRows.length * sRowH; // 14 + 108 = 122pt

      // Left: Remarks Box
      drawBox(doc, startX, sec5StartY, remarksW, 14);
      drawText(doc, 'Remarks:', startX, sec5StartY, remarksW, 14, { bold: true, size: 7.5, align: 'left' });

      drawBox(doc, startX, sec5StartY + 14, remarksW, sec5TotalH - 14);
      drawText(doc, remarks, startX, sec5StartY + 14, remarksW, sec5TotalH - 14, { bold: true, size: 7.2, align: 'center' });

      // Right: Summary Table
      const summaryAmtW = 68;
      const summaryLblW = summaryW - summaryAmtW; // 130
      const sAmtX = summarySplitX + summaryLblW;

      // Summary Header
      drawBox(doc, summarySplitX, sec5StartY, summaryLblW, summaryHeaderH, { fill: headerFill });
      drawText(doc, 'Summary', summarySplitX, sec5StartY, summaryLblW, summaryHeaderH, { bold: true, size: 7.5, align: 'center' });

      drawBox(doc, sAmtX, sec5StartY, summaryAmtW, summaryHeaderH, { fill: headerFill });
      drawText(doc, 'Amount', sAmtX, sec5StartY, summaryAmtW, summaryHeaderH, { bold: true, size: 7.5, align: 'center' });

      // Summary Body Rows
      summaryRows.forEach((sr, idx) => {
        const rY = sec5StartY + summaryHeaderH + idx * sRowH;
        drawBox(doc, summarySplitX, rY, summaryLblW, sRowH);
        drawText(doc, sr.label, summarySplitX, rY, summaryLblW, sRowH, { bold: sr.bold, size: 7.5, align: 'right' });

        drawBox(doc, sAmtX, rY, summaryAmtW, sRowH);
        drawText(doc, sr.val, sAmtX, rY, summaryAmtW, sRowH, { bold: sr.bold, size: 7.5, align: 'right' });
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
      // ==========================================
      const declH = 64;
      const declSplitX = startX + 335;

      // Left Box: Declaration
      drawBox(doc, startX, currentY, 335, declH);
      drawText(doc, 'Declaration', startX, currentY + 3, 335, 12, { bold: true, size: 7.5, align: 'center', valign: 'top' });
      drawText(doc, 'we declare that this invoice raised is Correct and that all particulars given are True', startX, currentY + 16, 335, 12, { size: 6.8, align: 'center', valign: 'top' });
      drawText(doc, "Customer's Seal and Signature", startX, currentY, 335, declH, { size: 7.5, align: 'left', valign: 'bottom' });

      // Right Box: Signature
      drawBox(doc, declSplitX, currentY, totalWidth - 335, declH);
      // Signer Name
      drawText(doc, 'KASARABADA\nSATCHIDANAND', declSplitX + 8, currentY + 8, 90, 24, { bold: true, size: 9, align: 'left', valign: 'top', lineGap: 1 });
      // Digital Sign Block with dynamically updated date and time
      const sigTimestamp = getDigitalSignatureTimestamp();
      const digitalText = `Digitally signed by\nKASARABADA\nSATCHIDANAND\nDate: ${sigTimestamp}`;
      drawText(doc, digitalText, declSplitX + 90, currentY + 5, (totalWidth - 335) - 94, 40, { size: 6.2, align: 'left', valign: 'top', lineGap: 0.8 });
      // Authorised Signatory label
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

      doc.end();

      stream.on('finish', () => resolve(fileName));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}
