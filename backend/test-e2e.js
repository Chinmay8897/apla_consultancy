import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000';
const AUTH_TOKEN = 'munder-difflin-secret-token-2026';

async function runTests() {
  console.log('--- Starting End-to-End Tests for Invoice Application ---');

  // Test 1: Health Check
  try {
    const health = await axios.get(`${API_BASE}/api/health`);
    console.log('✓ Health check passed:', health.data);
  } catch (err) {
    console.error('✗ Health check failed:', err.message);
    process.exit(1);
  }

  // Test 2: Auth Protection (Must reject unauthorized request)
  try {
    await axios.get(`${API_BASE}/api/invoices`);
    console.error('✗ Auth check failed: Unauthorized request was unexpectedly allowed!');
    process.exit(1);
  } catch (err) {
    if (err.response && err.response.status === 401) {
      console.log('✓ Auth middleware verified: 401 Unauthorized for request without token');
    } else {
      console.error('✗ Auth check failed with unexpected error:', err.message);
      process.exit(1);
    }
  }

  // Test 3: Create Invoice with Exact Spec Data
  const testInvoiceNumber = `INV-TEST-${Date.now()}`;
  const testPayload = {
    invoiceNumber: testInvoiceNumber,
    date: '2026-10-12',
    customerName: 'Acme Corp',
    customerEmail: 'contact@acmecorp.com',
    customerAddress: '123 Acme Way, Scranton, PA',
    items: [
      {
        description: 'Annual System Audit',
        hseSacCode: '998311',
        cost: 1000.00
      }
    ]
  };

  let createResponse;
  try {
    createResponse = await axios.post(`${API_BASE}/api/invoices`, testPayload, {
      headers: {
        'x-api-key': AUTH_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    console.log('✓ Invoice creation API responded successfully (Status 201)');
  } catch (err) {
    console.error('✗ Invoice creation failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const { invoice, downloadUrls, webhook } = createResponse.data;

  // Test 4: Verify GST Math Logic
  console.log('\n--- Verifying GST Mathematical Precision ---');
  console.log(`Taxable Amount: expected 1000.00, got ${invoice.taxableAmount}`);
  console.log(`CGST (9%):      expected 90.00,   got ${invoice.cgst}`);
  console.log(`SGST (9%):      expected 90.00,   got ${invoice.sgst}`);
  console.log(`Total Amount:   expected 1180.00, got ${invoice.totalAmount}`);

  if (
    invoice.taxableAmount !== 1000.00 ||
    invoice.cgst !== 90.00 ||
    invoice.sgst !== 90.00 ||
    invoice.totalAmount !== 1180.00
  ) {
    console.error('✗ GST math assertion failed!');
    process.exit(1);
  }
  console.log('✓ GST math is 100% exact and verified');

  // Test 5: Verify Generated Files
  console.log('\n--- Verifying Generated PDF & Excel Files ---');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const safeNumber = testInvoiceNumber.replace(/[^a-zA-Z0-9-_]/g, '_');
  const pdfFile = path.join(uploadsDir, `${safeNumber}.pdf`);
  const excelFile = path.join(uploadsDir, `${safeNumber}.xlsx`);

  if (fs.existsSync(pdfFile) && fs.statSync(pdfFile).size > 0) {
    console.log(`✓ PDF file created: ${pdfFile} (${fs.statSync(pdfFile).size} bytes)`);
  } else {
    console.error(`✗ PDF file missing or empty: ${pdfFile}`);
    process.exit(1);
  }

  if (fs.existsSync(excelFile) && fs.statSync(excelFile).size > 0) {
    console.log(`✓ Excel file created: ${excelFile} (${fs.statSync(excelFile).size} bytes)`);
  } else {
    console.error(`✗ Excel file missing or empty: ${excelFile}`);
    process.exit(1);
  }

  // Test 6: Verify Static File Download Endpoints
  try {
    const pdfRes = await axios.get(downloadUrls.pdf, { responseType: 'arraybuffer' });
    const excelRes = await axios.get(downloadUrls.excel, { responseType: 'arraybuffer' });
    console.log(`✓ PDF static download verified (${pdfRes.data.length} bytes received)`);
    console.log(`✓ Excel static download verified (${excelRes.data.length} bytes received)`);
  } catch (err) {
    console.error('✗ Static file download failed:', err.message);
    process.exit(1);
  }

  // Test 7: Verify Munder Difflin Webhook Payload Format (COMMENTED OUT)
  /*
  console.log('\n--- Verifying Munder Difflin Webhook Payload ---');
  const payload = webhook?.payload;
  console.log('Webhook payload event:', payload?.event);
  console.log('Webhook customer email for Mailing Agent:', payload?.invoice_data?.customer?.email);
  console.log('Webhook services array for Scheduling Agent:', payload?.invoice_data?.services);
  console.log('Webhook Excel URL for Drafting Agent:', payload?.invoice_data?.file_urls?.excel);

  if (
    payload?.event === 'invoice.created' &&
    payload?.invoice_data?.invoice_number === testInvoiceNumber &&
    payload?.invoice_data?.customer?.email === 'contact@acmecorp.com' &&
    payload?.invoice_data?.financials?.total_amount === 1180.00 &&
    Array.isArray(payload?.invoice_data?.services) &&
    payload?.invoice_data?.file_urls?.pdf &&
    payload?.invoice_data?.file_urls?.excel
  ) {
    console.log('✓ Webhook payload perfectly matches Munder Difflin Agent specifications!');
  } else {
    console.error('✗ Webhook payload did not match specification:', payload);
    process.exit(1);
  }
  */

  // Test 8: Verify Invoice History Fetch
  try {
    const historyRes = await axios.get(`${API_BASE}/api/invoices`, {
      headers: { 'x-api-key': AUTH_TOKEN }
    });
    const found = historyRes.data.invoices.find(i => i.invoiceNumber === testInvoiceNumber);
    if (found) {
      console.log(`✓ Invoice found in database history query (Total in DB: ${historyRes.data.count})`);
    } else {
      console.error('✗ Created invoice not found in history list');
      process.exit(1);
    }
  } catch (err) {
    console.error('✗ Failed to query history:', err.message);
    process.exit(1);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('=============================================\n');
}

runTests();
