// Simple test runner for PDF generation and loyalty accrual
// This matches the project's testing style without external dependencies

import { generateVoucherPDF } from '@/lib/voucher-pdf-improved';
import { generateMonthlyRegisterPDF } from '@/lib/voucher-register-pdf-improved';
import { accrueLoyaltyPoints } from '@/lib/loyalty-accrual';
import { VOUCHER_TYPES, PAYMENT_MODES } from '@/types/pdf-generation';

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn: () => Promise<any>, expectedMessage: string): Promise<void> {
  return fn().then(
    () => { throw new Error(`Expected function to throw with message: ${expectedMessage}`); },
    (error) => {
      if (!error.message.includes(expectedMessage)) {
        throw new Error(`Expected error message to contain "${expectedMessage}", got "${error.message}"`);
      }
    }
  );
}

// Mock implementations for testing with enhanced type safety
const mockTx = {
  $queryRawUnsafe: async <T = unknown>(query: string, ...params: (string | number | boolean | null)[]): Promise<T[]> => {
    // Mock different query results based on the query content
    if (query.includes('LoyaltySettings')) {
      return [{ pointsPerRupee: 0.1, redeemRupeePerPoint: 1 }] as T[];
    }
    if (query.includes('Payment')) {
      return [{ total: 0 }] as T[];
    }
    if (query.includes('LoyaltyLedger')) {
      return [] as T[]; // No existing entries
    }
    return [] as T[];
  },
  $executeRawUnsafe: async (query: string, ...params: (string | number | boolean | null)[]): Promise<number> => {
    // Mock successful insert/update operations
    return 1; // Return 1 affected row
  }
};

// Mock jsPDF
const mockJsPDF = () => ({
  internal: { pageSize: { width: 210, height: 297 } },
  setLineWidth: () => {},
  setDrawColor: () => {},
  rect: () => {},
  setFillColor: () => {},
  setTextColor: () => {},
  setFont: () => {},
  setFontSize: () => {},
  getTextWidth: () => 50,
  splitTextToSize: (text: string) => text.split('\n'),
  text: () => {},
  addImage: () => {},
  line: () => {},
  saveGraphicsState: () => {},
  restoreGraphicsState: () => {},
  setGState: () => {},
  output: () => new Blob(['pdf data'], { type: 'application/pdf' })
});

// Mock canvas and image
global.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      clearRect: () => {},
      drawImage: () => {},
      toDataURL: () => 'data:image/png;base64,mockdata'
    })
  })
} as any;

global.Image = function(this: any) {
  this.crossOrigin = '';
  this.src = '';
  this.width = 100;
  this.height = 100;
  this.onload = null;
  this.onerror = null;
  
  // Simulate successful load
  setTimeout(() => {
    if (this.onload) this.onload();
  }, 0);
} as any;

async function testPDFGeneration() {
  console.log('Testing PDF Generation...');
  
  const validVoucherData = {
    voucherNumber: 'V001',
    date: new Date('2024-01-01'),
    type: VOUCHER_TYPES.EXPENSE,
    amount: 1000,
    narration: 'Test voucher',
    category: 'Office Supplies',
    vendorName: 'Test Vendor',
    paymentMode: PAYMENT_MODES.CASH,
    createdBy: 'Admin',
    companyName: 'Test Company',
    companyAddress: '123 Test St',
    companyPhone: '+1234567890',
    companyEmail: 'test@example.com',
    logoUrl: undefined,
    invoiceNumber: 'INV001',
    customerName: 'Test Customer'
  };

  try {
    // Test valid data
    const result = await generateVoucherPDF(validVoucherData);
    assert(result instanceof Blob, 'PDF generation should return a Blob');
    assert(result.type === 'application/pdf', 'Blob should be of type application/pdf');
    console.log('✓ PDF generation with valid data works');

    // Test missing required field
    const invalidData = { ...validVoucherData, voucherNumber: '' };
    await assertThrows(
      () => generateVoucherPDF(invalidData),
      'Voucher number is required and must be a string'
    );
    console.log('✓ PDF generation validates required fields');

    // Test invalid amount
    const invalidAmountData = { ...validVoucherData, amount: -100 };
    await assertThrows(
      () => generateVoucherPDF(invalidAmountData),
      'Amount must be a non-negative number'
    );
    console.log('✓ PDF generation validates amount');

    // Test invalid voucher type
    const invalidTypeData = { ...validVoucherData, type: 'INVALID_TYPE' };
    await assertThrows(
      () => generateVoucherPDF(invalidTypeData),
      'Invalid voucher type'
    );
    console.log('✓ PDF generation validates voucher type');

  } catch (error) {
    console.error('❌ PDF generation test failed:', error);
    throw error;
  }
}

async function testVoucherRegisterPDF() {
  console.log('Testing Voucher Register PDF...');
  
  const validRegisterData = {
    month: 'January',
    year: 2024,
    companyName: 'Test Company',
    generatedBy: 'Admin',
    entries: [{
      date: new Date('2024-01-01'),
      voucherNo: 'V001',
      type: VOUCHER_TYPES.EXPENSE,
      category: 'Office Supplies',
      vendor: 'Test Vendor',
      narration: 'Test entry',
      amount: 1000,
      debit: 1000,
      credit: 0
    }],
    totalCount: 1,
    totalAmount: 1000,
    totalDebits: 1000,
    totalCredits: 0
  };

  try {
    const result = await generateMonthlyRegisterPDF(validRegisterData);
    assert(result instanceof Blob, 'Register PDF generation should return a Blob');
    console.log('✓ Register PDF generation with valid data works');

    // Test missing required field
    const invalidData = { ...validRegisterData, companyName: '' };
    await assertThrows(
      () => generateMonthlyRegisterPDF(invalidData),
      'Company name is required and must be a string'
    );
    console.log('✓ Register PDF generation validates required fields');

    // Test empty entries
    const emptyEntriesData = { ...validRegisterData, entries: [] };
    await assertThrows(
      () => generateMonthlyRegisterPDF(emptyEntriesData),
      'Entries array cannot be empty'
    );
    console.log('✓ Register PDF generation validates entries array');

  } catch (error) {
    console.error('❌ Register PDF generation test failed:', error);
    throw error;
  }
}

async function testLoyaltyAccrual() {
  console.log('Testing Loyalty Accrual...');
  
  const validLoyaltyInput = {
    tx: mockTx,
    customerId: 'customer-123',
    invoiceId: 'invoice-123',
    invoiceNumber: 'INV001',
    invoiceTotal: 1000,
    invoiceDate: new Date('2024-01-01')
  };

  try {
    // Test valid accrual
    await accrueLoyaltyPoints(validLoyaltyInput);
    console.log('✓ Loyalty accrual with valid data works');

    // Test missing parameters
    const invalidInput = { ...validLoyaltyInput, customerId: '' };
    await assertThrows(
      () => accrueLoyaltyPoints(invalidInput),
      'Missing required parameters'
    );
    console.log('✓ Loyalty accrual validates required parameters');

    // Test invalid invoice total
    const invalidTotalInput = { ...validLoyaltyInput, invoiceTotal: -100 };
    await assertThrows(
      () => accrueLoyaltyPoints(invalidTotalInput),
      'Invalid invoice total'
    );
    console.log('✓ Loyalty accrual validates invoice total');

  } catch (error) {
    console.error('❌ Loyalty accrual test failed:', error);
    throw error;
  }
}

async function runAllTests() {
  console.log('🧪 Running PDF Generation and Loyalty Accrual Tests...\n');
  
  try {
    await testPDFGeneration();
    console.log('');
    
    await testVoucherRegisterPDF();
    console.log('');
    
    await testLoyaltyAccrual();
    console.log('');
    
    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

export { runAllTests };
