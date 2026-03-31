// Type definitions for PDF generation and loyalty system

import { PrismaTx } from "@/lib/accounting";

// Enhanced type definitions for better type safety
export interface LoyaltyDatabaseTx {
  $queryRawUnsafe: <T = unknown>(query: string, ...params: (string | number | boolean | null)[]) => Promise<T[]>;
  $executeRawUnsafe: (query: string, ...params: (string | number | boolean | null)[]) => Promise<number | { affectedRows: number }>;
}

export interface VoucherPDFData {
  voucherNumber: string;
  date: Date;
  type: string;
  amount: number;
  narration: string | null;
  category: string;
  vendorName?: string | null;
  paymentMode: string;
  createdBy: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string;
  invoiceNumber?: string | null;
  customerName?: string | null;
}

export interface RegisterEntry {
  date: Date;
  voucherNo: string;
  type: string;
  category: string;
  vendor: string;
  narration: string;
  amount: number;
  debit?: number;
  credit?: number;
}

export interface VoucherRegisterData {
  datePeriod: string;
  companyName: string;
  generatedBy: string;
  entries: RegisterEntry[];
  totalCount: number;
  totalAmount: number;
  totalDebits?: number;
  totalCredits?: number;
}

export interface LoyaltyAccrualInput {
  tx: LoyaltyDatabaseTx;
  customerId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  invoiceDate: Date;
}

export interface LoyaltySettings {
  pointsPerRupee: number;
  redeemRupeePerPoint: number;
}

export interface LoyaltyLedgerEntry {
  id: string;
  customerId: string;
  invoiceId: string;
  type: string;
  points: number;
  rupeeValue: number;
  remarks: string;
  createdAt: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Voucher type constants for type safety
export const VOUCHER_TYPES = {
  EXPENSE: 'EXPENSE',
  RECEIPT: 'RECEIPT',
  PAYMENT: 'PAYMENT',
  JOURNAL: 'JOURNAL',
  REVERSAL: 'REVERSAL',
  CANCELLED: 'CANCELLED'
} as const;

export type VoucherType = typeof VOUCHER_TYPES[keyof typeof VOUCHER_TYPES];

// Payment mode constants
export const PAYMENT_MODES = {
  CASH: 'CASH',
  BANK: 'BANK',
  CARD: 'CARD',
  CHEQUE: 'CHEQUE',
  ONLINE: 'ONLINE'
} as const;

export type PaymentMode = typeof PAYMENT_MODES[keyof typeof PAYMENT_MODES];

// Validation helpers with consistent logic
export function validateVoucherPDFData(data: VoucherPDFData): ValidationResult {
  const errors: ValidationError[] = [];

  // Helper function to validate optional string fields
  const validateOptionalString = (value: any, fieldName: string): boolean => {
    if (value === null || value === undefined) return true; // null/undefined are allowed
    if (typeof value !== 'string') {
      errors.push({ 
        field: fieldName, 
        message: `${fieldName} must be a string or null`, 
        value 
      });
      return false;
    }
    if (value.length > 1000) { // Reasonable length limit
      errors.push({ 
        field: fieldName, 
        message: `${fieldName} must be 1000 characters or less`, 
        value 
      });
      return false;
    }
    return true;
  };

  // Required field validation
  if (!data.voucherNumber || typeof data.voucherNumber !== 'string') {
    errors.push({ field: 'voucherNumber', message: 'Voucher number is required and must be a string', value: data.voucherNumber });
  } else if (data.voucherNumber.length === 0 || data.voucherNumber.length > 100) {
    errors.push({ field: 'voucherNumber', message: 'Voucher number must be 1-100 characters', value: data.voucherNumber });
  }

  if (!data.date || !(data.date instanceof Date) || isNaN(data.date.getTime())) {
    errors.push({ field: 'date', message: 'Valid date is required', value: data.date });
  } else {
    // Validate date range (not too far in past or future)
    const minDate = new Date('2000-01-01');
    const maxDate = new Date('2100-12-31');
    if (data.date < minDate || data.date > maxDate) {
      errors.push({ field: 'date', message: 'Date must be between year 2000 and 2100', value: data.date });
    }
  }

  if (!data.type || typeof data.type !== 'string') {
    errors.push({ field: 'type', message: 'Voucher type is required and must be a string', value: data.type });
  }

  if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount < 0 || data.amount > 999999999.99) {
    errors.push({ field: 'amount', message: 'Amount must be a non-negative number less than 1 billion', value: data.amount });
  }

  if (!data.category || typeof data.category !== 'string') {
    errors.push({ field: 'category', message: 'Category is required and must be a string', value: data.category });
  } else if (data.category.length === 0 || data.category.length > 100) {
    errors.push({ field: 'category', message: 'Category must be 1-100 characters', value: data.category });
  }

  if (!data.paymentMode || typeof data.paymentMode !== 'string') {
    errors.push({ field: 'paymentMode', message: 'Payment mode is required and must be a string', value: data.paymentMode });
  }

  if (!data.createdBy || typeof data.createdBy !== 'string') {
    errors.push({ field: 'createdBy', message: 'Created by field is required and must be a string', value: data.createdBy });
  } else if (data.createdBy.length === 0 || data.createdBy.length > 255) {
    errors.push({ field: 'createdBy', message: 'Created by must be 1-255 characters', value: data.createdBy });
  }

  if (!data.companyName || typeof data.companyName !== 'string') {
    errors.push({ field: 'companyName', message: 'Company name is required and must be a string', value: data.companyName });
  } else if (data.companyName.length === 0 || data.companyName.length > 255) {
    errors.push({ field: 'companyName', message: 'Company name must be 1-255 characters', value: data.companyName });
  }

  // Optional field validation using helper
  validateOptionalString(data.narration, 'narration');
  validateOptionalString(data.vendorName, 'vendorName');
  validateOptionalString(data.companyAddress, 'companyAddress');
  validateOptionalString(data.companyPhone, 'companyPhone');
  validateOptionalString(data.companyEmail, 'companyEmail');
  validateOptionalString(data.logoUrl, 'logoUrl');
  validateOptionalString(data.invoiceNumber, 'invoiceNumber');
  validateOptionalString(data.customerName, 'customerName');

  // Additional validation for email format
  if (data.companyEmail && typeof data.companyEmail === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.companyEmail)) {
      errors.push({ field: 'companyEmail', message: 'Invalid email format', value: data.companyEmail });
    }
  }

  // Additional validation for phone format (basic)
  if (data.companyPhone && typeof data.companyPhone === 'string') {
    const phoneRegex = /^[+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(data.companyPhone) || data.companyPhone.length < 10 || data.companyPhone.length > 20) {
      errors.push({ field: 'companyPhone', message: 'Invalid phone number format', value: data.companyPhone });
    }
  }

  // Validate voucher type
  if (data.type && !isValidVoucherType(data.type)) {
    errors.push({ field: 'type', message: `Invalid voucher type: ${data.type}. Must be one of: ${Object.values(VOUCHER_TYPES).join(', ')}`, value: data.type });
  }

  // Validate payment mode
  if (data.paymentMode && !isValidPaymentMode(data.paymentMode)) {
    errors.push({ field: 'paymentMode', message: `Invalid payment mode: ${data.paymentMode}. Must be one of: ${Object.values(PAYMENT_MODES).join(', ')}`, value: data.paymentMode });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateVoucherRegisterData(data: VoucherRegisterData): ValidationResult {
  const errors: ValidationError[] = [];

  // Required field validation
  if (!data.datePeriod || typeof data.datePeriod !== 'string') {
    errors.push({ field: 'datePeriod', message: 'Date period is required and must be a string', value: data.datePeriod });
  }

  if (!data.companyName || typeof data.companyName !== 'string') {
    errors.push({ field: 'companyName', message: 'Company name is required and must be a string', value: data.companyName });
  }

  if (!data.generatedBy || typeof data.generatedBy !== 'string') {
    errors.push({ field: 'generatedBy', message: 'Generated by field is required and must be a string', value: data.generatedBy });
  }

  if (!Array.isArray(data.entries)) {
    errors.push({ field: 'entries', message: 'Entries must be an array', value: data.entries });
  } else if (data.entries.length === 0) {
    errors.push({ field: 'entries', message: 'Entries array cannot be empty', value: data.entries });
  } else {
    // Validate each entry
    data.entries.forEach((entry, index) => {
      if (!entry.date || !(entry.date instanceof Date) || isNaN(entry.date.getTime())) {
        errors.push({ field: `entries[${index}].date`, message: 'Valid date is required for each entry', value: entry.date });
      }
      if (!entry.voucherNo || typeof entry.voucherNo !== 'string') {
        errors.push({ field: `entries[${index}].voucherNo`, message: 'Voucher number is required for each entry', value: entry.voucherNo });
      }
      if (!entry.type || typeof entry.type !== 'string') {
        errors.push({ field: `entries[${index}].type`, message: 'Type is required for each entry', value: entry.type });
      }
      if (typeof entry.amount !== 'number' || isNaN(entry.amount) || entry.amount < 0) {
        errors.push({ field: `entries[${index}].amount`, message: 'Amount must be a non-negative number for each entry', value: entry.amount });
      }
    });
  }

  if (typeof data.totalCount !== 'number' || data.totalCount < 0) {
    errors.push({ field: 'totalCount', message: 'Total count must be a non-negative number', value: data.totalCount });
  }

  if (typeof data.totalAmount !== 'number' || isNaN(data.totalAmount) || data.totalAmount < 0) {
    errors.push({ field: 'totalAmount', message: 'Total amount must be a non-negative number', value: data.totalAmount });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isValidVoucherType(type: string): type is VoucherType {
  return Object.values(VOUCHER_TYPES).includes(type as VoucherType);
}

export function isValidPaymentMode(mode: string): mode is PaymentMode {
  return Object.values(PAYMENT_MODES).includes(mode as PaymentMode);
}
