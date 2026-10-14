import * as XLSX from 'xlsx';
import { formatInvoiceDate, numberToWords, getDigitalSignatureTimestamp } from './formatters.js';

/**
 * Generates an invoice Excel (.xlsx) file matching the Anand Professionals & Law Advisors template.
 * Built using SheetJS (xlsx) for 100% browser-safe, instant, zero-dependency client execution.
 * @param {Object} invoiceData 
 * @returns {Promise<{ blob: Blob, url: string, fileName: string }>}
 */
export async function generateClientInvoiceExcel(invoiceData) {
  const safeNumber = (invoiceData.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${safeNumber}.xlsx`;

  // Company and invoice details
  const companyTitle = 'ANAND PROFESSIONALS & LAW ADVISORS GST-TAX INVOICE';
  const companyAddress = 'B-102, HIDDEN TREASURE APARTMENTS, AYYAPPA SWAMY TEMPLE LANE, RAJBHAVAN ROAD, SOMAJIGUDA, HYDERABAD, TELANGANA STATE';
  const companyEmail = 'EMAIL - anand@apla.org.in';
  const companyGstin = '36AAPFA6515M1Z1';

  const customerName = invoiceData.customerName || '';
  const customerAddress = invoiceData.customerAddress || '';
  const customerGstin = invoiceData.customerGstin || '';
  const placeOfSupply = invoiceData.placeOfSupply || '';
  const reverseCharge = invoiceData.reverseCharge || '';

  const invoiceNo = invoiceData.invoiceNumber || '';
  const invoiceDate = invoiceData.date ? formatInvoiceDate(invoiceData.date) : '';
  const poNumber = invoiceData.poNumber || '';
  const poDate = invoiceData.poDate || '';
  const grn = invoiceData.grn || '';

  const items = (invoiceData.items && invoiceData.items.length > 0) ? invoiceData.items : [];

  const taxableAmount = invoiceData.taxableAmount !== undefined 
    ? invoiceData.taxableAmount 
    : items.reduce((acc, it) => acc + (parseFloat(it.cost) || 0), 0);
  const cgst = invoiceData.cgst !== undefined ? invoiceData.cgst : Number((taxableAmount * 0.09).toFixed(2));
  const sgst = invoiceData.sgst !== undefined ? invoiceData.sgst : Number((taxableAmount * 0.09).toFixed(2));
  const totalAmount = invoiceData.totalAmount !== undefined ? invoiceData.totalAmount : Number((taxableAmount + cgst + sgst).toFixed(2));

  const defaultRemarks = items[0]?.description?.toLowerCase().includes('retainer')
    ? `Towards Retainer fee for the Month of ${invoiceDate ? (new Date(invoiceData.date || Date.now()).toLocaleString('default', { month: 'long', year: 'numeric' })).toUpperCase() : 'APRIL 2026'}`
    : `Towards ${items[0]?.description || 'Professional Services'}`;
  const remarks = invoiceData.remarks || defaultRemarks;
  const wordsAmount = numberToWords(totalAmount);
  const sigTimestamp = getDigitalSignatureTimestamp().replace('\n', ' ');

  // Build grid data (15 columns: A to O)
  const rows = [];
  const merges = [];

  // Helper to append a row and return row index
  const addRow = (rowCells) => {
    rows.push(rowCells);
    return rows.length - 1;
  };

  // Row 0: Company Title (A1:O1)
  const r0 = addRow([companyTitle]);
  merges.push({ s: { r: r0, c: 0 }, e: { r: r0, c: 14 } });

  // Row 1: Company Address (A2:O2)
  const r1 = addRow([companyAddress]);
  merges.push({ s: { r: r1, c: 0 }, e: { r: r1, c: 14 } });

  // Row 2: Company Email (A3:O3)
  const r2 = addRow([companyEmail]);
  merges.push({ s: { r: r2, c: 0 }, e: { r: r2, c: 14 } });

  // Row 3: Customer Details & Invoice No
  const r3 = addRow([`Customer Details: Customer Name: ${customerName}`, '', '', '', '', '', '', '', '', 'INVOICE NO :', '', '', invoiceNo]);
  merges.push({ s: { r: r3, c: 0 }, e: { r: r3, c: 8 } });
  merges.push({ s: { r: r3, c: 9 }, e: { r: r3, c: 11 } });
  merges.push({ s: { r: r3, c: 12 }, e: { r: r3, c: 14 } });

  // Row 4: Address & Date
  const r4 = addRow([`Address: ${customerAddress}`, '', '', '', '', '', '', '', '', 'DATE:', '', '', invoiceDate]);
  merges.push({ s: { r: r4, c: 0 }, e: { r: r4, c: 8 } });
  merges.push({ s: { r: r4, c: 9 }, e: { r: r4, c: 11 } });
  merges.push({ s: { r: r4, c: 12 }, e: { r: r4, c: 14 } });

  // Row 5: Customer GSTIN & PO NO
  const r5 = addRow([`Customer GSTIN/ UID : ${customerGstin}`, '', '', '', '', '', '', '', '', 'P O NO:', '', '', poNumber]);
  merges.push({ s: { r: r5, c: 0 }, e: { r: r5, c: 8 } });
  merges.push({ s: { r: r5, c: 9 }, e: { r: r5, c: 11 } });
  merges.push({ s: { r: r5, c: 12 }, e: { r: r5, c: 14 } });

  // Row 6: Place of supply & Reverse Charge headers + PO DATE
  const r6 = addRow(['Place of supply', '', '', '', '', 'Reverse Charge', '', '', '', 'PO DATE:', '', '', poDate]);
  merges.push({ s: { r: r6, c: 0 }, e: { r: r6, c: 4 } });
  merges.push({ s: { r: r6, c: 5 }, e: { r: r6, c: 8 } });
  merges.push({ s: { r: r6, c: 9 }, e: { r: r6, c: 11 } });
  merges.push({ s: { r: r6, c: 12 }, e: { r: r6, c: 14 } });

  // Row 7: Place of supply & Reverse Charge values + GRN
  const r7 = addRow([placeOfSupply, '', '', '', '', reverseCharge, '', '', '', 'GRN:', '', '', grn]);
  merges.push({ s: { r: r7, c: 0 }, e: { r: r7, c: 4 } });
  merges.push({ s: { r: r7, c: 5 }, e: { r: r7, c: 8 } });
  merges.push({ s: { r: r7, c: 9 }, e: { r: r7, c: 11 } });
  merges.push({ s: { r: r7, c: 12 }, e: { r: r7, c: 14 } });

  // Row 8: Product-wise Details Bar
  const r8 = addRow(['Product-wise Details:']);
  merges.push({ s: { r: r8, c: 0 }, e: { r: r8, c: 14 } });

  // Row 9 & 10: Table Headers
  const r9 = addRow(['Sr. No.', 'Product Description', 'HSE/SAC Code', 'Qty', 'Unit', 'Rate', 'Total Sale', 'Disc.', 'Taxable Value', 'CGST', '', 'SGST', '', 'IGST', '']);
  merges.push({ s: { r: r9, c: 9 }, e: { r: r9, c: 10 } });
  merges.push({ s: { r: r9, c: 11 }, e: { r: r9, c: 12 } });
  merges.push({ s: { r: r9, c: 13 }, e: { r: r9, c: 14 } });

  const r10 = addRow(['', '', '', '', '', '', '', '', '', 'Rate %', 'Amount', 'Rate %', 'Amount', 'Rate %', 'Amount']);
  // Span standard header columns across row 9 & 10
  for (let c = 0; c <= 8; c++) {
    merges.push({ s: { r: r9, c }, e: { r: r10, c } });
  }

  // Row 11+: Item rows
  items.forEach((item, index) => {
    const qty = parseInt(item.qty, 10) || 1;
    const cost = parseFloat(item.cost) || 0;
    const rate = item.rate !== undefined ? (parseFloat(item.rate) || 0) : (qty > 1 ? cost / qty : cost);
    const lineTotal = item.totalSale !== undefined ? (parseFloat(item.totalSale) || 0) : (rate * qty || cost);

    addRow([
      index + 1,
      item.description,
      item.hseSacCode || '998311',
      qty,
      item.unit || '-',
      rate,
      lineTotal,
      '-',
      lineTotal,
      '9%',
      Number((lineTotal * 0.09).toFixed(2)),
      '9%',
      Number((lineTotal * 0.09).toFixed(2)),
      '0%',
      '-'
    ]);
  });

  // Minimum 3 item rows
  const fillerCount = Math.max(0, 3 - items.length);
  for (let f = 0; f < fillerCount; f++) {
    addRow(['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']);
  }

  // Total Row
  const rTot = addRow(['', '', '', '', '', 'Total', taxableAmount, '-', taxableAmount, '', cgst, '', sgst, '', '-']);
  merges.push({ s: { r: rTot, c: 0 }, e: { r: rTot, c: 4 } });

  // Remarks & Summary Section (8 lines)
  const summaryLines = [
    { label: 'Total Invoice Value', val: taxableAmount },
    { label: 'Online Charges', val: '-' },
    { label: 'Total Discounts', val: '-' },
    { label: 'Total Taxable Value', val: taxableAmount },
    { label: 'Total CGST', val: cgst },
    { label: 'Total SGST', val: sgst },
    { label: 'Total IGST', val: '-' },
    { label: 'Grand Total', val: totalAmount }
  ];

  // Header for Remarks / Summary
  const rRemH = addRow(['Remarks:', '', '', '', '', '', '', '', '', 'Summary', '', '', '', 'Amount', '']);
  merges.push({ s: { r: rRemH, c: 0 }, e: { r: rRemH, c: 8 } });
  merges.push({ s: { r: rRemH, c: 9 }, e: { r: rRemH, c: 12 } });
  merges.push({ s: { r: rRemH, c: 13 }, e: { r: rRemH, c: 14 } });

  const remStartRow = rows.length;
  summaryLines.forEach((s) => {
    const rIdx = addRow(['', '', '', '', '', '', '', '', '', s.label, '', '', '', s.val, '']);
    merges.push({ s: { r: rIdx, c: 9 }, e: { r: rIdx, c: 12 } });
    merges.push({ s: { r: rIdx, c: 13 }, e: { r: rIdx, c: 14 } });
  });
  const remEndRow = rows.length - 1;

  // Set remarks on first data row and merge left box
  rows[remStartRow][0] = remarks;
  merges.push({ s: { r: remStartRow, c: 0 }, e: { r: remEndRow, c: 8 } });

  // Total Amount In Words
  const rWords = addRow(['Total Amount (In words) :', '', '', '', wordsAmount]);
  merges.push({ s: { r: rWords, c: 0 }, e: { r: rWords, c: 3 } });
  merges.push({ s: { r: rWords, c: 4 }, e: { r: rWords, c: 14 } });

  // GSTIN & Company Banner
  const rGst = addRow([`GSTIN:  ${companyGstin}`, '', '', '', '', '', '', '', '', 'ANAND PROFESSIONALS & LAW ADVISORS']);
  merges.push({ s: { r: rGst, c: 0 }, e: { r: rGst, c: 8 } });
  merges.push({ s: { r: rGst, c: 9 }, e: { r: rGst, c: 14 } });

  // Declaration & Signature
  const declText = 'Declaration: we declare that this invoice raised is Correct and that all particulars given are True\nCustomer\'s Seal and Signature';
  const signText = `KASARABADA SATCHIDANAND\nDigitally signed by KASARABADA SATCHIDANAND\nDate: ${sigTimestamp}\nAuthorised Signatory`;
  const rDecl = addRow([declText, '', '', '', '', '', '', '', '', signText]);
  merges.push({ s: { r: rDecl, c: 0 }, e: { r: rDecl, c: 8 } });
  merges.push({ s: { r: rDecl, c: 9 }, e: { r: rDecl, c: 14 } });

  // Bank Details
  const bankText = 'Note: Make all cheques payable to Company Name\nBank: State Bank of India     Branch: Bellavista\nAccount No: 36413276577       IFSC Code: SBIN0020063';
  const rBank = addRow([bankText]);
  merges.push({ s: { r: rBank, c: 0 }, e: { r: rBank, c: 14 } });

  // Jurisdiction Footer
  const rJur = addRow(['SUBJECT TO HYDERABAD JURISDICTION']);
  merges.push({ s: { r: rJur, c: 0 }, e: { r: rJur, c: 14 } });

  // Create SheetJS Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set exact column widths
  worksheet['!cols'] = [
    { wch: 8 },   // A: Sr. No.
    { wch: 34 },  // B: Product Description
    { wch: 14 },  // C: HSE/SAC Code
    { wch: 7 },   // D: Qty
    { wch: 7 },   // E: Unit
    { wch: 12 },  // F: Rate
    { wch: 13 },  // G: Total Sale
    { wch: 8 },   // H: Disc.
    { wch: 14 },  // I: Taxable Value
    { wch: 10 },  // J: CGST Rate %
    { wch: 13 },  // K: CGST Amount
    { wch: 10 },  // L: SGST Rate %
    { wch: 13 },  // M: SGST Amount
    { wch: 10 },  // N: IGST Rate %
    { wch: 12 }   // O: IGST Amount
  ];

  worksheet['!merges'] = merges;

  // Create workbook and write array
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'GST Tax Invoice');

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '';

  return { blob, url, fileName };
}
