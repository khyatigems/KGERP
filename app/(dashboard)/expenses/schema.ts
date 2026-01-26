import { z } from "zod";

export const expenseSchema = z.object({
  expenseDate: z.date(),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  vendorName: z.string().optional(),
  referenceNo: z.string().optional(),
  baseAmount: z.coerce.number().min(0, "Amount must be non-negative"),
  gstApplicable: z.boolean(),
  gstRate: z.coerce.number().min(0).default(0),
  gstAmount: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0),
  paymentMode: z.string().min(1, "Payment mode is required"),
  paymentStatus: z.string().min(1, "Payment status is required"),
  paidAmount: z.coerce.number().min(0).default(0),
  paymentDate: z.date().optional(),
  paymentRef: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseSchema>;
