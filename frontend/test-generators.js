import fs from 'fs';
import path from 'path';
import { generateClientInvoicePdf } from './src/utils/clientPdfGenerator.js';
import { generateClientInvoiceExcel } from './src/utils/clientExcelGenerator.js';
import { generateInvoicePdf } from '../backend/src/utils/pdfGenerator.js';

console.log('--- STARTING COMPREHENSIVE GENERATOR TESTS ---');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASSED: ${message}`);
    passed++;
  }
}

async function runTests() {
  // Test Case 1: Non-GST Invoice
  console.log('\n[TEST 1] Non-GST Client PDF & Excel');
  const nonGstData = {
    invoiceNumber: 'INV-TEST-NONGST',
    date: '2026-10-14',
    customerName: 'Acme Advisory Pvt Ltd',
    customerEmail: 'finance@acme.com',
    customerAddress: '101 Cyber Towers, Hitec City, Hyderabad',
    customerGstin: '',
    placeOfSupply: 'TELANGANA (36)',
    reverseCharge: 'No',
    gstEnabled: false,
    igstEnabled: false,
    taxableAmount: 75000,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalAmount: 75000,
    items: [
      {
        description: 'Corporate Legal Compliance & Statutory Audit Services',
        hseSacCode: '998311',
        cost: 75000
      }
    ]
  };

  const nonGstPdf = await generateClientInvoicePdf(nonGstData);
  assert(nonGstPdf.blob && nonGstPdf.blob.size > 1000, `Non-GST PDF generated with size ${nonGstPdf.blob?.size} bytes`);
  assert(nonGstPdf.fileName === 'INV-TEST-NONGST.pdf', `Non-GST PDF filename correct: ${nonGstPdf.fileName}`);

  const nonGstExcel = await generateClientInvoiceExcel(nonGstData);
  assert(nonGstExcel.blob && nonGstExcel.blob.size > 1000, `Non-GST Excel generated with size ${nonGstExcel.blob?.size} bytes`);

  // Test Case 2: IGST Invoice (Inter-State)
  console.log('\n[TEST 2] IGST Client PDF & Excel (Inter-State 18%)');
  const igstData = {
    invoiceNumber: 'INV-TEST-IGST',
    date: '2026-10-14',
    customerName: 'Bengaluru Tech Labs',
    customerEmail: 'accounts@bengaluru.tech',
    customerAddress: '42 MG Road, Bengaluru, Karnataka',
    customerGstin: '29AABCU9603R1ZM',
    placeOfSupply: 'KARNATAKA (29)',
    reverseCharge: 'No',
    gstEnabled: true,
    igstEnabled: true,
    igstRate: 18,
    taxableAmount: 100000,
    cgst: 0,
    sgst: 0,
    igst: 18000,
    totalAmount: 118000,
    items: [
      {
        description: 'Cross-Border Technology IP & Advisory Retainer',
        hseSacCode: '998311',
        cost: 100000
      }
    ]
  };

  const igstPdf = await generateClientInvoicePdf(igstData);
  assert(igstPdf.blob && igstPdf.blob.size > 1000, `IGST PDF generated with size ${igstPdf.blob?.size} bytes`);

  const igstExcel = await generateClientInvoiceExcel(igstData);
  assert(igstExcel.blob && igstExcel.blob.size > 1000, `IGST Excel generated with size ${igstExcel.blob?.size} bytes`);

  // Test Case 3: CGST + SGST Invoice (Intra-State)
  console.log('\n[TEST 3] CGST + SGST Client PDF & Excel (Intra-State 9%+9%)');
  const intraGstData = {
    invoiceNumber: 'INV-TEST-INTRA',
    date: '2026-10-14',
    customerName: 'Hyderabad Pharma Solutions',
    customerEmail: 'billing@hydpharma.in',
    customerAddress: 'Road No 36, Jubilee Hills, Hyderabad',
    customerGstin: '36AAPFA6515M1Z1',
    placeOfSupply: 'TELANGANA (36)',
    reverseCharge: 'No',
    gstEnabled: true,
    igstEnabled: false,
    taxableAmount: 50000,
    cgst: 4500,
    sgst: 4500,
    igst: 0,
    totalAmount: 59000,
    items: [
      {
        description: 'Monthly Regulatory Retainer & Legal Counsel',
        hseSacCode: '998311',
        cost: 50000
      }
    ]
  };

  const intraPdf = await generateClientInvoicePdf(intraGstData);
  assert(intraPdf.blob && intraPdf.blob.size > 1000, `Intra-state PDF generated with size ${intraPdf.blob?.size} bytes`);

  const intraExcel = await generateClientInvoiceExcel(intraGstData);
  assert(intraExcel.blob && intraExcel.blob.size > 1000, `Intra-state Excel generated with size ${intraExcel.blob?.size} bytes`);

  // Test Case 4: Backend PDFKit Generator Verification
  console.log('\n[TEST 4] Backend Node.js PDFKit Generator (Non-GST, IGST, Intra-GST)');
  const outDir = path.join(process.cwd(), 'test-out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const bNonGst = await generateInvoicePdf(nonGstData, outDir);
  assert(fs.existsSync(path.join(outDir, bNonGst)), `Backend Non-GST PDF file created: ${bNonGst}`);

  const bIgst = await generateInvoicePdf(igstData, outDir);
  assert(fs.existsSync(path.join(outDir, bIgst)), `Backend IGST PDF file created: ${bIgst}`);

  const bIntra = await generateInvoicePdf(intraGstData, outDir);
  assert(fs.existsSync(path.join(outDir, bIntra)), `Backend Intra-GST PDF file created: ${bIntra}`);

  // Cleanup test files
  fs.rmSync(outDir, { recursive: true, force: true });

  console.log(`\n========================================`);
  console.log(`ALL TESTS PASSED: ${passed}/${passed + failed}`);
  console.log(`========================================\n`);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
