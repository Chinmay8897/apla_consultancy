import * as XLSX from 'xlsx';
import { formatInvoiceDate, numberToWords } from './formatters.js';

/**
 * Generates an invoice Excel (.xlsx) file matching the Anand Professionals & Law Advisors template.
 * Built using SheetJS (xlsx) for 100% browser-safe, instant, zero-dependency client execution.
 * Supports Non-GST mode, IGST mode, and CGST+SGST mode with Service-wise Details.
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

  // Client Details
  const clientName = invoiceData.customerName || invoiceData.clientName || '';
  const clientAddress = invoiceData.customerAddress || invoiceData.clientAddress || '';
  const clientGstin = invoiceData.customerGstin || invoiceData.clientGstin || '';
  const placeOfSupply = invoiceData.placeOfSupply || '';
  const reverseCharge = invoiceData.reverseCharge || '';

  const invoiceNo = invoiceData.invoiceNumber || '';
  const invoiceDate = invoiceData.date ? formatInvoiceDate(invoiceData.date) : '';
  const poNumber = invoiceData.poNumber || '';
  const poDate = invoiceData.poDate || '';
  const grn = invoiceData.grn || '';

  const items = (invoiceData.items && invoiceData.items.length > 0) ? invoiceData.items : [];

  // Determine GST Settings:
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

  // Total columns count depends on GST
  // Non-GST: 4 cols (A-D) -> stretched to 8 cols for header
  // IGST: 6 cols
  // CGST+SGST: 8 cols
  const colCount = !gstEnabled ? 6 : (igstEnabled ? 6 : 8);
  const maxColIdx = colCount - 1;

  const rows = [];
  const merges = [];

  const addRow = (rowCells) => {
    // Pad to colCount length
    while (rowCells.length < colCount) {
      rowCells.push('');
    }
    rows.push(rowCells);
    return rows.length - 1;
  };

  // Row 0: Company Title
  const r0 = addRow([companyTitle]);
  merges.push({ s: { r: r0, c: 0 }, e: { r: r0, c: maxColIdx } });

  // Row 1: Company Address
  const r1 = addRow([companyAddress]);
  merges.push({ s: { r: r1, c: 0 }, e: { r: r1, c: maxColIdx } });

  // Row 2: Company Email
  const r2 = addRow([companyEmail]);
  merges.push({ s: { r: r2, c: 0 }, e: { r: r2, c: maxColIdx } });

  // Row 3: Client Details & Invoice No
  const midCol = Math.max(3, maxColIdx - 2);
  const r3 = addRow([`Client Details: Client Name: ${clientName}`]);
  rows[r3][midCol] = 'INVOICE NO :';
  rows[r3][maxColIdx] = invoiceNo;
  merges.push({ s: { r: r3, c: 0 }, e: { r: r3, c: midCol - 1 } });
  merges.push({ s: { r: r3, c: midCol }, e: { r: r3, c: maxColIdx - 1 } });

  // Row 4: Address & Date
  const r4 = addRow([`Address: ${clientAddress}`]);
  rows[r4][midCol] = 'DATE:';
  rows[r4][maxColIdx] = invoiceDate;
  merges.push({ s: { r: r4, c: 0 }, e: { r: r4, c: midCol - 1 } });
  merges.push({ s: { r: r4, c: midCol }, e: { r: r4, c: maxColIdx - 1 } });

  // Row 5: Client GSTIN & PO NO
  const r5 = addRow([`Client GSTIN/ UID : ${clientGstin}`]);
  rows[r5][midCol] = 'P O NO:';
  rows[r5][maxColIdx] = poNumber;
  merges.push({ s: { r: r5, c: 0 }, e: { r: r5, c: midCol - 1 } });
  merges.push({ s: { r: r5, c: midCol }, e: { r: r5, c: maxColIdx - 1 } });

  // Row 6: Place of supply & Reverse Charge headers + PO DATE
  const halfMid = Math.floor(midCol / 2);
  const r6 = addRow(['Place of supply']);
  rows[r6][halfMid] = 'Reverse Charge';
  rows[r6][midCol] = 'PO DATE:';
  rows[r6][maxColIdx] = poDate;
  merges.push({ s: { r: r6, c: 0 }, e: { r: r6, c: halfMid - 1 } });
  merges.push({ s: { r: r6, c: halfMid }, e: { r: r6, c: midCol - 1 } });
  merges.push({ s: { r: r6, c: midCol }, e: { r: r6, c: maxColIdx - 1 } });

  // Row 7: Place of supply & Reverse Charge values + GRN
  const r7 = addRow([placeOfSupply]);
  rows[r7][halfMid] = reverseCharge;
  rows[r7][midCol] = 'GRN:';
  rows[r7][maxColIdx] = grn;
  merges.push({ s: { r: r7, c: 0 }, e: { r: r7, c: halfMid - 1 } });
  merges.push({ s: { r: r7, c: halfMid }, e: { r: r7, c: midCol - 1 } });
  merges.push({ s: { r: r7, c: midCol }, e: { r: r7, c: maxColIdx - 1 } });

  // Row 8: Service-wise Details Bar
  const r8 = addRow(['Service-wise Details:']);
  merges.push({ s: { r: r8, c: 0 }, e: { r: r8, c: maxColIdx } });

  // Table Headers & Rows
  if (!gstEnabled) {
    // Non-GST Table (Cols: Sr. No., Service Description, HSE/SAC Code, Service Charges)
    const rH = addRow(['Sr. No.', 'Service Description', '', 'HSE/SAC Code', 'Service Charges', '']);
    merges.push({ s: { r: rH, c: 1 }, e: { r: rH, c: 2 } });
    merges.push({ s: { r: rH, c: 4 }, e: { r: rH, c: 5 } });

    items.forEach((item, index) => {
      const cost = parseFloat(item.cost) || 0;
      const rItem = addRow([index + 1, item.description, '', item.hseSacCode || '998311', cost, '']);
      merges.push({ s: { r: rItem, c: 1 }, e: { r: rItem, c: 2 } });
      merges.push({ s: { r: rItem, c: 4 }, e: { r: rItem, c: 5 } });
    });

    const fillerCount = Math.max(0, 3 - items.length);
    for (let f = 0; f < fillerCount; f++) {
      const rF = addRow(['-', '-', '', '-', '-', '']);
      merges.push({ s: { r: rF, c: 1 }, e: { r: rF, c: 2 } });
      merges.push({ s: { r: rF, c: 4 }, e: { r: rF, c: 5 } });
    }

    const rTot = addRow(['Total', '', '', '', taxableAmount, '']);
    merges.push({ s: { r: rTot, c: 0 }, e: { r: rTot, c: 3 } });
    merges.push({ s: { r: rTot, c: 4 }, e: { r: rTot, c: 5 } });

  } else if (igstEnabled) {
    // IGST Table (Sr. No., Service Description, HSE/SAC Code, Service Charges, IGST Rate%, Amount)
    const rH1 = addRow(['Sr. No.', 'Service Description', 'HSE/SAC Code', 'Service Charges', 'IGST', '']);
    merges.push({ s: { r: rH1, c: 4 }, e: { r: rH1, c: 5 } });

    const rH2 = addRow(['', '', '', '', 'Rate %', 'Amount']);
    for (let c = 0; c <= 3; c++) {
      merges.push({ s: { r: rH1, c }, e: { r: rH2, c } });
    }

    items.forEach((item, index) => {
      const cost = parseFloat(item.cost) || 0;
      const lineIgst = Number((cost * (igstRateVal / 100)).toFixed(2));
      addRow([index + 1, item.description, item.hseSacCode || '998311', cost, `${igstRateVal}%`, lineIgst]);
    });

    const fillerCount = Math.max(0, 3 - items.length);
    for (let f = 0; f < fillerCount; f++) {
      addRow(['-', '-', '-', '-', '-', '-']);
    }

    const rTot = addRow(['Total', '', '', taxableAmount, '-', igst]);
    merges.push({ s: { r: rTot, c: 0 }, e: { r: rTot, c: 2 } });

  } else {
    // CGST + SGST Table (8 cols: Sr. No., Service Description, HSE/SAC Code, Service Charges, CGST Rate, Amt, SGST Rate, Amt)
    const rH1 = addRow(['Sr. No.', 'Service Description', 'HSE/SAC Code', 'Service Charges', 'CGST', '', 'SGST', '']);
    merges.push({ s: { r: rH1, c: 4 }, e: { r: rH1, c: 5 } });
    merges.push({ s: { r: rH1, c: 6 }, e: { r: rH1, c: 7 } });

    const rH2 = addRow(['', '', '', '', 'Rate %', 'Amount', 'Rate %', 'Amount']);
    for (let c = 0; c <= 3; c++) {
      merges.push({ s: { r: rH1, c }, e: { r: rH2, c } });
    }

    items.forEach((item, index) => {
      const cost = parseFloat(item.cost) || 0;
      const lineCgst = Number((cost * 0.09).toFixed(2));
      const lineSgst = Number((cost * 0.09).toFixed(2));
      addRow([index + 1, item.description, item.hseSacCode || '998311', cost, '9%', lineCgst, '9%', lineSgst]);
    });

    const fillerCount = Math.max(0, 3 - items.length);
    for (let f = 0; f < fillerCount; f++) {
      addRow(['-', '-', '-', '-', '-', '-', '-', '-']);
    }

    const rTot = addRow(['Total', '', '', taxableAmount, '-', cgst, '-', sgst]);
    merges.push({ s: { r: rTot, c: 0 }, e: { r: rTot, c: 2 } });
  }

  // Summary Lines
  let summaryLines = [];
  if (!gstEnabled) {
    summaryLines = [
      { label: 'Total Invoice Value', val: taxableAmount },
      { label: 'Online Charges', val: '-' },
      { label: 'Total Discounts', val: '-' },
      { label: 'Grand Total', val: totalAmount }
    ];
  } else if (igstEnabled) {
    summaryLines = [
      { label: 'Total Invoice Value', val: taxableAmount },
      { label: 'Online Charges', val: '-' },
      { label: 'Total Discounts', val: '-' },
      { label: 'Total Taxable Value', val: taxableAmount },
      { label: `Total IGST (${igstRateVal}%)`, val: igst },
      { label: 'Grand Total', val: totalAmount }
    ];
  } else {
    summaryLines = [
      { label: 'Total Invoice Value', val: taxableAmount },
      { label: 'Online Charges', val: '-' },
      { label: 'Total Discounts', val: '-' },
      { label: 'Total Taxable Value', val: taxableAmount },
      { label: 'Total CGST (9%)', val: cgst },
      { label: 'Total SGST (9%)', val: sgst },
      { label: 'Grand Total', val: totalAmount }
    ];
  }

  // Header for Remarks / Summary
  const rRemH = addRow(['Remarks:']);
  rows[rRemH][midCol] = 'Summary';
  rows[rRemH][maxColIdx] = 'Amount';
  merges.push({ s: { r: rRemH, c: 0 }, e: { r: rRemH, c: midCol - 1 } });
  merges.push({ s: { r: rRemH, c: midCol }, e: { r: rRemH, c: maxColIdx - 1 } });

  const remStartRow = rows.length;
  summaryLines.forEach((s) => {
    const rIdx = addRow(['']);
    rows[rIdx][midCol] = s.label;
    rows[rIdx][maxColIdx] = s.val;
    merges.push({ s: { r: rIdx, c: midCol }, e: { r: rIdx, c: maxColIdx - 1 } });
  });
  const remEndRow = rows.length - 1;

  rows[remStartRow][0] = remarks;
  merges.push({ s: { r: remStartRow, c: 0 }, e: { r: remEndRow, c: midCol - 1 } });

  // Total Amount In Words
  const rWords = addRow(['Total Amount (In words) :']);
  rows[rWords][2] = wordsAmount;
  merges.push({ s: { r: rWords, c: 0 }, e: { r: rWords, c: 1 } });
  merges.push({ s: { r: rWords, c: 2 }, e: { r: rWords, c: maxColIdx } });

  // GSTIN & Company Banner
  const rGst = addRow([`GSTIN:  ${companyGstin}`]);
  rows[rGst][midCol] = 'ANAND PROFESSIONALS & LAW ADVISORS';
  merges.push({ s: { r: rGst, c: 0 }, e: { r: rGst, c: midCol - 1 } });
  merges.push({ s: { r: rGst, c: midCol }, e: { r: rGst, c: maxColIdx } });

  // Declaration & Signature (Digital signature field left blank as requested)
  const declText = "Declaration: we declare that this invoice raised is Correct and that all particulars given are True\nClient's Seal and Signature";
  const signText = "Authorised Signatory";
  const rDecl = addRow([declText]);
  rows[rDecl][midCol] = signText;
  merges.push({ s: { r: rDecl, c: 0 }, e: { r: rDecl, c: midCol - 1 } });
  merges.push({ s: { r: rDecl, c: midCol }, e: { r: rDecl, c: maxColIdx } });

  // Bank Details
  const bankText = 'Note: Make all cheques payable to Company Name\nBank: State Bank of India     Branch: Bellavista\nAccount No: 36413276577       IFSC Code: SBIN0020063';
  const rBank = addRow([bankText]);
  merges.push({ s: { r: rBank, c: 0 }, e: { r: rBank, c: maxColIdx } });

  // Jurisdiction Footer
  const rJur = addRow(['SUBJECT TO HYDERABAD JURISDICTION']);
  merges.push({ s: { r: rJur, c: 0 }, e: { r: rJur, c: maxColIdx } });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 8 },   // A: Sr. No.
    { wch: 38 },  // B: Service Description
    { wch: 15 },  // C: HSE/SAC Code
    { wch: 16 },  // D: Service Charges
    { wch: 12 },  // E: Rate % / CGST
    { wch: 14 },  // F: Amount / SGST
    { wch: 12 },  // G
    { wch: 14 }   // H
  ];

  worksheet['!merges'] = merges;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, gstEnabled ? 'GST Tax Invoice' : 'Invoice');

  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : '';

  return { blob, url, fileName };
}
