import ExcelJS from 'exceljs';
import { formatInvoiceDate, numberToWords, getDigitalSignatureTimestamp } from './formatters.js';

const thinBorder = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

const headerFill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFEAEAEA' }
};

/**
 * Merges a range of cells and applies unified borders, font, alignment, and fill.
 */
function mergeAndStyle(worksheet, range, value, {
  bold = false,
  size = 9,
  fontName = 'Arial',
  color = 'FF000000',
  align = 'center',
  valign = 'middle',
  wrapText = false,
  fill = null,
  border = thinBorder,
  numFmt = null
} = {}) {
  worksheet.mergeCells(range);
  const startRef = range.split(':')[0];
  const startCell = worksheet.getCell(startRef);
  if (value !== undefined && value !== null) {
    startCell.value = value;
  }

  const endRef = range.split(':')[1];
  const endCell = worksheet.getCell(endRef);

  for (let r = startCell.row; r <= endCell.row; r++) {
    const row = worksheet.getRow(r);
    for (let c = startCell.col; c <= endCell.col; c++) {
      const cell = row.getCell(c);
      if (border) cell.border = border;
      if (fill) cell.fill = fill;
      cell.font = { name: fontName, size, bold, color: { argb: color } };
      cell.alignment = { horizontal: align, vertical: valign, wrapText };
      if (numFmt) cell.numFmt = numFmt;
    }
  }
}

/**
 * Sets styling on a single cell.
 */
function styleCell(cell, value, {
  bold = false,
  size = 9,
  fontName = 'Arial',
  color = 'FF000000',
  align = 'center',
  valign = 'middle',
  wrapText = false,
  fill = null,
  border = thinBorder,
  numFmt = null
} = {}) {
  if (value !== undefined && value !== null) {
    cell.value = value;
  }
  if (border) cell.border = border;
  if (fill) cell.fill = fill;
  cell.font = { name: fontName, size, bold, color: { argb: color } };
  cell.alignment = { horizontal: align, vertical: valign, wrapText };
  if (numFmt) cell.numFmt = numFmt;
}

/**
 * Generates an invoice Excel (.xlsx) file matching Anand Professionals & Law Advisors template exactly.
 * Runs completely client-side in the browser.
 * @param {Object} invoiceData 
 * @returns {Promise<{ blob: Blob, url: string, fileName: string }>}
 */
export async function generateClientInvoiceExcel(invoiceData) {
  const safeNumber = (invoiceData.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${safeNumber}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ANAND PROFESSIONALS & LAW ADVISORS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('GST Tax Invoice', {
    views: [{ showGridLines: true }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1
    }
  });

  // 15 Columns matching Product-wise Table schema
  worksheet.columns = [
    { key: 'colA', width: 6 },   // 1: Sr. No.
    { key: 'colB', width: 34 },  // 2: Product Description
    { key: 'colC', width: 14 },  // 3: HSE/SAC Code
    { key: 'colD', width: 6 },   // 4: Qty
    { key: 'colE', width: 6 },   // 5: Unit
    { key: 'colF', width: 11 },  // 6: Rate
    { key: 'colG', width: 12 },  // 7: Total Sale
    { key: 'colH', width: 7 },   // 8: Disc.
    { key: 'colI', width: 13 },  // 9: Taxable Value
    { key: 'colJ', width: 8 },   // 10: CGST Rate %
    { key: 'colK', width: 11 },  // 11: CGST Amount
    { key: 'colL', width: 8 },   // 12: SGST Rate %
    { key: 'colM', width: 11 },  // 13: SGST Amount
    { key: 'colN', width: 8 },   // 14: IGST Rate %
    { key: 'colO', width: 10 }   // 15: IGST Amount
  ];

  // Data extraction with fallbacks
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

  // --- Row 1: Company Title ---
  worksheet.getRow(1).height = 24;
  mergeAndStyle(worksheet, 'A1:O1', companyTitle, { bold: true, size: 11, align: 'center' });

  // --- Row 2: Company Address ---
  worksheet.getRow(2).height = 20;
  mergeAndStyle(worksheet, 'A2:O2', companyAddress, { bold: true, size: 8, align: 'center' });

  // --- Row 3: Company Email ---
  worksheet.getRow(3).height = 18;
  mergeAndStyle(worksheet, 'A3:O3', companyEmail, { bold: true, size: 8.5, align: 'center' });

  // --- Row 4 to 8: Customer Details & Invoice Meta ---
  worksheet.getRow(4).height = 28;
  mergeAndStyle(worksheet, 'A4:I4', `Customer Details:\nCustomer Name:   ${customerName}`, { bold: true, size: 8, align: 'left', wrapText: true });
  mergeAndStyle(worksheet, 'J4:L4', 'INVOICE NO :', { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, 'M4:O4', invoiceNo, { bold: true, size: 8.5, align: 'center' });

  worksheet.getRow(5).height = 28;
  mergeAndStyle(worksheet, 'A5:I5', `Address:   ${customerAddress}`, { bold: true, size: 7.5, align: 'left', wrapText: true });
  mergeAndStyle(worksheet, 'J5:L5', 'DATE:', { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, 'M5:O5', invoiceDate, { bold: true, size: 8.5, align: 'center' });

  worksheet.getRow(6).height = 20;
  mergeAndStyle(worksheet, 'A6:I6', `Customer GSTIN/ UID :   ${customerGstin}`, { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, 'J6:L6', 'P O NO:', { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, 'M6:O6', poNumber, { bold: true, size: 8.5, align: 'center' });

  worksheet.getRow(7).height = 18;
  mergeAndStyle(worksheet, 'A7:E7', 'Place of supply', { bold: true, size: 8, align: 'center' });
  mergeAndStyle(worksheet, 'F7:I7', 'Reverse Charge', { bold: true, size: 8, align: 'center' });
  mergeAndStyle(worksheet, 'J7:L7', 'PO DATE:', { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, 'M7:O7', poDate, { bold: true, size: 8.5, align: 'center' });

  worksheet.getRow(8).height = 18;
  mergeAndStyle(worksheet, 'A8:E8', placeOfSupply, { bold: true, size: 8.5, align: 'center' });
  mergeAndStyle(worksheet, 'F8:I8', reverseCharge, { bold: true, size: 8.5, align: 'center' });
  mergeAndStyle(worksheet, 'J8:L8', 'GRN:', { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, 'M8:O8', grn, { bold: true, size: 8.5, align: 'center' });

  // --- Row 9: Product-wise Details Bar ---
  worksheet.getRow(9).height = 18;
  mergeAndStyle(worksheet, 'A9:O9', 'Product-wise Details:', { bold: true, size: 8.5, align: 'left' });

  // --- Row 10 & 11: Main Table Header ---
  worksheet.getRow(10).height = 18;
  worksheet.getRow(11).height = 18;

  mergeAndStyle(worksheet, 'A10:A11', 'Sr. No.', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'B10:B11', 'Product Description', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'C10:C11', 'HSE/SAC Code', { bold: true, size: 8, fill: headerFill, align: 'center', wrapText: true });
  mergeAndStyle(worksheet, 'D10:D11', 'Qty', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'E10:E11', 'Unit', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'F10:F11', 'Rate', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'G10:G11', 'Total Sale', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'H10:H11', 'Disc.', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'I10:I11', 'Taxable Value', { bold: true, size: 8, fill: headerFill, align: 'center', wrapText: true });

  mergeAndStyle(worksheet, 'J10:K10', 'CGST', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'L10:M10', 'SGST', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, 'N10:O10', 'IGST', { bold: true, size: 8, fill: headerFill, align: 'center' });

  styleCell(worksheet.getCell('J11'), 'Rate %', { bold: true, size: 7.5, fill: headerFill, align: 'center' });
  styleCell(worksheet.getCell('K11'), 'Amount', { bold: true, size: 7.5, fill: headerFill, align: 'center' });
  styleCell(worksheet.getCell('L11'), 'Rate %', { bold: true, size: 7.5, fill: headerFill, align: 'center' });
  styleCell(worksheet.getCell('M11'), 'Amount', { bold: true, size: 7.5, fill: headerFill, align: 'center' });
  styleCell(worksheet.getCell('N11'), 'Rate %', { bold: true, size: 7.5, fill: headerFill, align: 'center' });
  styleCell(worksheet.getCell('O11'), 'Amount', { bold: true, size: 7.5, fill: headerFill, align: 'center' });

  // --- Row 12+: Body Rows ---
  let currentRow = 12;

  items.forEach((item, index) => {
    const cost = parseFloat(item.cost) || 0;
    const row = worksheet.getRow(currentRow);
    row.height = 26;

    styleCell(row.getCell(1), index + 1, { size: 8, align: 'center' });
    styleCell(row.getCell(2), item.description, { bold: true, size: 8, align: 'center', wrapText: true });
    styleCell(row.getCell(3), item.hseSacCode || '998311', { size: 8, align: 'center' });
    styleCell(row.getCell(4), item.qty || 1, { size: 8, align: 'center' });
    styleCell(row.getCell(5), item.unit || '-', { size: 8, align: 'center' });
    styleCell(row.getCell(6), cost, { size: 8, align: 'right', numFmt: '#,##0.00' });
    styleCell(row.getCell(7), cost, { size: 8, align: 'right', numFmt: '#,##0.00' });
    styleCell(row.getCell(8), '-', { size: 8, align: 'center' });
    styleCell(row.getCell(9), cost, { size: 8, align: 'right', numFmt: '#,##0.00' });
    styleCell(row.getCell(10), '9%', { size: 8, align: 'center' });
    styleCell(row.getCell(11), cost * 0.09, { size: 8, align: 'right', numFmt: '#,##0.00' });
    styleCell(row.getCell(12), '9%', { size: 8, align: 'center' });
    styleCell(row.getCell(13), cost * 0.09, { size: 8, align: 'right', numFmt: '#,##0.00' });
    styleCell(row.getCell(14), '0%', { size: 8, align: 'center' });
    styleCell(row.getCell(15), '-', { size: 8, align: 'center' });

    currentRow++;
  });

  // Filler rows if fewer than 3 items
  const fillerCount = Math.max(0, 3 - items.length);
  for (let f = 0; f < fillerCount; f++) {
    const row = worksheet.getRow(currentRow);
    row.height = 18;
    for (let c = 1; c <= 15; c++) {
      styleCell(row.getCell(c), '-', { size: 8, align: 'center' });
    }
    currentRow++;
  }

  // --- Total Row ---
  worksheet.getRow(currentRow).height = 20;
  mergeAndStyle(worksheet, `A${currentRow}:E${currentRow}`, '', { align: 'center' });
  styleCell(worksheet.getCell(`F${currentRow}`), 'Total', { bold: true, size: 8.5, align: 'center' });
  styleCell(worksheet.getCell(`G${currentRow}`), taxableAmount, { bold: true, size: 8.5, align: 'right', numFmt: '#,##0.00' });
  styleCell(worksheet.getCell(`H${currentRow}`), '-', { size: 8, align: 'center' });
  styleCell(worksheet.getCell(`I${currentRow}`), taxableAmount, { bold: true, size: 8.5, align: 'right', numFmt: '#,##0.00' });
  styleCell(worksheet.getCell(`J${currentRow}`), '-', { size: 8, align: 'center' });
  styleCell(worksheet.getCell(`K${currentRow}`), cgst, { bold: true, size: 8.5, align: 'right', numFmt: '#,##0.00' });
  styleCell(worksheet.getCell(`L${currentRow}`), '-', { size: 8, align: 'center' });
  styleCell(worksheet.getCell(`M${currentRow}`), sgst, { bold: true, size: 8.5, align: 'right', numFmt: '#,##0.00' });
  styleCell(worksheet.getCell(`N${currentRow}`), '-', { size: 8, align: 'center' });
  styleCell(worksheet.getCell(`O${currentRow}`), '-', { size: 8, align: 'center' });
  currentRow++;

  // --- Remarks & Summary Section (8 rows) ---
  const remarksStartRow = currentRow;
  worksheet.getRow(remarksStartRow).height = 18;
  mergeAndStyle(worksheet, `A${remarksStartRow}:I${remarksStartRow}`, 'Remarks:', { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, `J${remarksStartRow}:M${remarksStartRow}`, 'Summary', { bold: true, size: 8, fill: headerFill, align: 'center' });
  mergeAndStyle(worksheet, `N${remarksStartRow}:O${remarksStartRow}`, 'Amount', { bold: true, size: 8, fill: headerFill, align: 'center' });

  const summaryData = [
    { label: 'Total Invoice Value', val: taxableAmount, num: true },
    { label: 'Online Charges', val: '-', num: false },
    { label: 'Total Discounts', val: '-', num: false },
    { label: 'Total Taxable Value', val: taxableAmount, num: true },
    { label: 'Total CGST', val: cgst, num: true },
    { label: 'Total SGST', val: sgst, num: true },
    { label: 'Total IGST', val: '-', num: false },
    { label: 'Grand Total', val: totalAmount, num: true, bold: true }
  ];

  summaryData.forEach((s, idx) => {
    const rIdx = remarksStartRow + 1 + idx;
    worksheet.getRow(rIdx).height = 17;
    mergeAndStyle(worksheet, `J${rIdx}:M${rIdx}`, s.label, { bold: !!s.bold, size: 8, align: 'right' });
    if (s.num) {
      mergeAndStyle(worksheet, `N${rIdx}:O${rIdx}`, s.val, { bold: !!s.bold, size: 8.5, align: 'right', numFmt: '#,##0.00' });
    } else {
      mergeAndStyle(worksheet, `N${rIdx}:O${rIdx}`, s.val, { bold: !!s.bold, size: 8, align: 'center' });
    }
  });

  // Remarks Body on left
  const remarksEndRow = remarksStartRow + summaryData.length;
  mergeAndStyle(worksheet, `A${remarksStartRow + 1}:I${remarksEndRow}`, remarks, { bold: true, size: 8, align: 'center', wrapText: true });
  currentRow = remarksEndRow + 1;

  // --- Total Amount (In words) ---
  worksheet.getRow(currentRow).height = 22;
  mergeAndStyle(worksheet, `A${currentRow}:D${currentRow}`, 'Total Amount (In words) :', { bold: true, size: 8, align: 'left' });
  mergeAndStyle(worksheet, `E${currentRow}:O${currentRow}`, wordsAmount, { bold: true, size: 8.5, align: 'center' });
  currentRow++;

  // --- GSTIN & Company Banner ---
  worksheet.getRow(currentRow).height = 20;
  mergeAndStyle(worksheet, `A${currentRow}:I${currentRow}`, `GSTIN:  ${companyGstin}`, { bold: true, size: 8.5, align: 'left' });
  mergeAndStyle(worksheet, `J${currentRow}:O${currentRow}`, 'ANAND PROFESSIONALS & LAW ADVISORS', { bold: true, size: 8.5, align: 'center' });
  currentRow++;

  // --- Declaration & Signatures ---
  worksheet.getRow(currentRow).height = 65;
  const declText = 'Declaration\nwe declare that this invoice raised is Correct and that all particulars given are True\n\nCustomer\'s Seal and Signature';
  mergeAndStyle(worksheet, `A${currentRow}:I${currentRow}`, declText, { size: 7.5, align: 'center', wrapText: true });

  const sigTime = getDigitalSignatureTimestamp().replace('\n', ' ');
  const signText = `KASARABADA SATCHIDANAND          Digitally signed by\n                                                  KASARABADA SATCHIDANAND\n                                                  Date: ${sigTime}\n\nAuthorised Signatory`;
  mergeAndStyle(worksheet, `J${currentRow}:O${currentRow}`, signText, { bold: true, size: 7.5, align: 'center', wrapText: true });
  currentRow++;

  // --- Bank Details ---
  worksheet.getRow(currentRow).height = 40;
  const bankText = 'Note: Make all cheques payable to Company Name\nBank: State Bank of India     Branch: Bellavista\nAccount No: 36413276577       IFSC Code: SBIN0020063';
  mergeAndStyle(worksheet, `A${currentRow}:O${currentRow}`, bankText, { bold: true, size: 7.5, align: 'left', wrapText: true });
  currentRow++;

  // --- Jurisdiction Footer ---
  worksheet.getRow(currentRow).height = 20;
  mergeAndStyle(worksheet, `A${currentRow}:O${currentRow}`, 'SUBJECT TO HYDERABAD JURISDICTION', { bold: true, size: 8, align: 'center' });

  // Browser writeBuffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '';

  return { blob, url, fileName };
}
