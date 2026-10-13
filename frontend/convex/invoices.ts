import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// 1. Query: List all invoices (sorted newest first)
export const getInvoices = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

// 2. Query: Get a single invoice by invoiceNumber
export const getInvoiceByNumber = query({
  args: { invoiceNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invoices")
      .withIndex("by_invoiceNumber", (q) => q.eq("invoiceNumber", args.invoiceNumber))
      .first();
  },
});

// 3. Mutation: Create an invoice
export const createInvoice = mutation({
  args: {
    invoiceNumber: v.string(),
    date: v.string(),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    customerAddress: v.optional(v.string()),
    customerGstin: v.optional(v.string()),
    placeOfSupply: v.optional(v.string()),
    reverseCharge: v.optional(v.string()),
    poNumber: v.optional(v.string()),
    poDate: v.optional(v.string()),
    grn: v.optional(v.string()),
    remarks: v.optional(v.string()),
    taxableAmount: v.number(),
    cgst: v.number(),
    sgst: v.number(),
    totalAmount: v.number(),
    pdfPath: v.optional(v.string()),
    excelPath: v.optional(v.string()),
    items: v.array(
      v.object({
        description: v.string(),
        hseSacCode: v.string(),
        cost: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Check if invoiceNumber already exists
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_invoiceNumber", (q) => q.eq("invoiceNumber", args.invoiceNumber))
      .first();

    if (existing) {
      throw new Error(`Invoice number ${args.invoiceNumber} already exists. Please choose a unique number.`);
    }

    const id = await ctx.db.insert("invoices", {
      ...args,
      createdAt: Date.now(),
    });

    return { id, invoiceNumber: args.invoiceNumber };
  },
});

// 4. Mutation: Delete an invoice
export const deleteInvoice = mutation({
  args: { id: v.id("invoices") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// 5. Query: List all audit schedule slots
export const getAuditSlots = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("auditSlots").collect();
  },
});

// 6. Mutation: Book or update an audit slot
export const bookAuditSlot = mutation({
  args: {
    date: v.string(),
    client: v.string(),
    auditType: v.string(),
    time: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("auditSlots")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "booked",
        client: args.client,
        auditType: args.auditType,
        time: args.time || "10:00 AM - 04:00 PM",
        note: args.note,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("auditSlots", {
        date: args.date,
        status: "booked",
        client: args.client,
        auditType: args.auditType,
        time: args.time || "10:00 AM - 04:00 PM",
        note: args.note,
      });
    }
  },
});

// 7. Mutation: Initialize default slots if table is empty
export const initializeAuditSlots = mutation({
  args: {
    slots: v.array(
      v.object({
        date: v.string(),
        status: v.string(),
        client: v.optional(v.string()),
        auditType: v.optional(v.string()),
        time: v.optional(v.string()),
        note: v.optional(v.string()),
        title: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("auditSlots").first();
    if (!existing) {
      for (const slot of args.slots) {
        await ctx.db.insert("auditSlots", slot);
      }
      return { initialized: true, count: args.slots.length };
    }
    return { initialized: false, message: "Slots already exist" };
  },
});
