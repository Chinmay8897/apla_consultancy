import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  invoices: defineTable({
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
    createdAt: v.number(),
  })
    .index("by_invoiceNumber", ["invoiceNumber"])
    .index("by_createdAt", ["createdAt"]),

  auditSlots: defineTable({
    date: v.string(), // Format: YYYY-MM-DD
    status: v.string(), // "available" | "booked" | "pending" | "holiday"
    client: v.optional(v.string()),
    auditType: v.optional(v.string()),
    time: v.optional(v.string()),
    note: v.optional(v.string()),
    title: v.optional(v.string()),
  }).index("by_date", ["date"]),
});
