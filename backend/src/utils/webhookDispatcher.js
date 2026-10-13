import axios from 'axios';

/**
 * Dispatches the invoice.created event to the Munder Difflin webhook endpoint.
 * @param {Object} invoice 
 * @param {Array} items 
 * @param {Object} fileUrls 
 * @returns {Promise<{success: boolean, response?: any, error?: string}>}
 */
export async function dispatchInvoiceWebhook(invoice, items, fileUrls) {
  // Munder Difflin webhook functionality commented out
  return { success: false, skipped: true, message: 'Munder Difflin webhook integration is currently commented out' };
  /*
  const webhookUrl = process.env.MUNDER_DIFFLIN_WEBHOOK_URL;
  const webhookSecret = process.env.MUNDER_DIFFLIN_WEBHOOK_SECRET || 'munder-difflin-secret';

  // Construct payload strictly conforming to munder_difflin_agents_integration.md
  const payload = {
    event: 'invoice.created',
    invoice_data: {
      invoice_number: invoice.invoiceNumber,
      date: invoice.date,
      customer: {
        name: invoice.customerName,
        email: invoice.customerEmail
      },
      financials: {
        taxable_amount: Number(invoice.taxableAmount.toFixed(2)),
        cgst_9_percent: Number(invoice.cgst.toFixed(2)),
        sgst_9_percent: Number(invoice.sgst.toFixed(2)),
        total_amount: Number(invoice.totalAmount.toFixed(2))
      },
      services: items.map(item => ({
        description: item.description,
        hse_sac_code: item.hseSacCode,
        cost: Number(Number(item.cost).toFixed(2))
      })),
      file_urls: {
        pdf: fileUrls.pdf,
        excel: fileUrls.excel
      }
    }
  };

  if (!webhookUrl) {
    console.warn('[Webhook] No MUNDER_DIFFLIN_WEBHOOK_URL specified. Skipping dispatch.');
    return { success: false, skipped: true, payload };
  }

  try {
    console.log(`[Webhook] Dispatching invoice.created to ${webhookUrl}...`);
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': webhookSecret,
        'User-Agent': 'Munder-Difflin-Invoice-Publisher/1.0'
      },
      timeout: 10000 // 10s timeout
    });

    console.log(`[Webhook] Successfully dispatched to Munder Difflin. HTTP status: ${response.status}`);
    return {
      success: true,
      status: response.status,
      data: response.data,
      payload
    };
  } catch (error) {
    console.error(`[Webhook] Dispatch failed: ${error.message}`);
    // Non-blocking: returns error details without crashing or rolling back files
    return {
      success: false,
      error: error.message,
      payload
    };
  }
  */
}
