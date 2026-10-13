import express from 'express';
import path from 'path';
import prisma from '../prisma.js';
import { generateInvoicePdf } from '../utils/pdfGenerator.js';
import { generateInvoiceExcel } from '../utils/excelGenerator.js';
// import { dispatchInvoiceWebhook } from '../utils/webhookDispatcher.js'; // Munder Difflin webhook disabled

const router = express.Router();

// GET /api/invoices - List all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, count: invoices.length, invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/invoices/:id - Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [{ id }, { invoiceNumber: id }]
      },
      include: { items: true }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({ success: true, invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/invoices - Create invoice, generate files, save to DB, trigger webhook
router.post('/', async (req, res) => {
  try {
    const {
      invoiceNumber,
      date,
      customerName,
      customerEmail,
      customerAddress,
      customerGstin,
      placeOfSupply,
      reverseCharge,
      poNumber,
      poDate,
      grn,
      remarks,
      items
    } = req.body;

    // Validation
    if (!invoiceNumber || !date || !customerName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required header fields: invoiceNumber, date, customerName'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one line item is required'
      });
    }

    // Check for duplicate invoiceNumber
    const existing = await prisma.invoice.findUnique({
      where: { invoiceNumber }
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Invoice number ${invoiceNumber} already exists. Please use a unique number.`
      });
    }

    // Mathematical calculations (exact GST 9% + 9%)
    let taxableAmount = 0;
    const sanitizedItems = items.map(item => {
      const cost = Math.max(0, parseFloat(item.cost) || 0);
      taxableAmount += cost;
      return {
        description: item.description?.trim() || '',
        hseSacCode: item.hseSacCode?.trim() || '',
        cost: Number(cost.toFixed(2))
      };
    });

    taxableAmount = Number(taxableAmount.toFixed(2));
    const cgst = Number((taxableAmount * 0.09).toFixed(2));
    const sgst = Number((taxableAmount * 0.09).toFixed(2));
    const totalAmount = Number((taxableAmount + cgst + sgst).toFixed(2));

    const finalCustomerEmail = customerEmail?.trim() || '';

    const invoicePayload = {
      invoiceNumber,
      date,
      customerName,
      customerEmail: finalCustomerEmail,
      customerAddress: customerAddress?.trim() || '',
      customerGstin: customerGstin?.trim() || '',
      placeOfSupply: placeOfSupply?.trim() || '',
      reverseCharge: reverseCharge?.trim() || '',
      poNumber: poNumber?.trim() || '',
      poDate: poDate?.trim() || '',
      grn: grn?.trim() || '',
      remarks: remarks?.trim() || undefined,
      taxableAmount,
      cgst,
      sgst,
      totalAmount,
      items: sanitizedItems
    };

    // Phase 3: File Generation
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const pdfFileName = await generateInvoicePdf(invoicePayload, uploadsDir);
    const excelFileName = await generateInvoiceExcel(invoicePayload, uploadsDir);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fileUrls = {
      pdf: `${baseUrl}/uploads/${pdfFileName}`,
      excel: `${baseUrl}/uploads/${excelFileName}`
    };

    // Phase 3: Save to SQLite via Prisma
    const savedInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        date,
        customerName,
        customerEmail: finalCustomerEmail,
        customerAddress: invoicePayload.customerAddress,
        customerGstin: invoicePayload.customerGstin || null,
        placeOfSupply: invoicePayload.placeOfSupply || null,
        reverseCharge: invoicePayload.reverseCharge || null,
        poNumber: invoicePayload.poNumber || null,
        poDate: invoicePayload.poDate || null,
        grn: invoicePayload.grn || null,
        remarks: invoicePayload.remarks || null,
        taxableAmount,
        cgst,
        sgst,
        totalAmount,
        pdfPath: `/uploads/${pdfFileName}`,
        excelPath: `/uploads/${excelFileName}`,
        webhookStatus: 'pending',
        items: {
          create: sanitizedItems.map(item => ({
            description: item.description,
            hseSacCode: item.hseSacCode,
            cost: item.cost
          }))
        }
      },
      include: { items: true }
    });

    // Phase 4: Dispatch Webhook to Munder Difflin (COMMENTED OUT)
    /*
    const webhookResult = await dispatchInvoiceWebhook(savedInvoice, savedInvoice.items, fileUrls);

    // Update webhook status in DB
    const finalWebhookStatus = webhookResult.success ? 'sent' : (webhookResult.skipped ? 'skipped' : 'failed');
    await prisma.invoice.update({
      where: { id: savedInvoice.id },
      data: { webhookStatus: finalWebhookStatus }
    });
    */

    res.status(201).json({
      success: true,
      message: 'Invoice generated and saved successfully',
      invoice: savedInvoice,
      downloadUrls: fileUrls
      // webhook: webhookResult // Munder Difflin webhook disabled
    });
  } catch (error) {
    console.error('Invoice creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while processing invoice'
    });
  }
});

export default router;
