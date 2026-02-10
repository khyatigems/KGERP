# Accounting Module Implementation Plan

## 1. Overview
The goal is to implement a Double-Entry Accounting System within the KhyatiGems ERP. This will enable real-time financial reporting (Profit & Loss, Balance Sheet, Trial Balance) and automated ledger maintenance.

## 2. Database Schema Changes

### 2.1. New Models
We need to introduce the following Prisma models to support double-entry bookkeeping:

```prisma
// Chart of Accounts
model Account {
  id          String   @id @default(uuid())
  code        String   @unique // e.g., "1001"
  name        String   // e.g., "Cash on Hand"
  type        String   // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  subtype     String?  // CASH, BANK, AR, AP, DIRECT_EXPENSE, etc.
  description String?
  isActive    Boolean  @default(true)
  
  journalLines JournalLine[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// Journal Entry (The header for a transaction)
model JournalEntry {
  id            String   @id @default(uuid())
  date          DateTime
  description   String
  referenceType String?  // INVOICE, EXPENSE, PAYMENT, MANUAL
  referenceId   String?  // ID of the source document
  
  lines         JournalLine[]
  
  createdById   String
  createdBy     User     @relation(fields: [createdById], references: [id])
  createdAt     DateTime @default(now())
  
  @@index([date])
  @@index([referenceId])
}

// Journal Line Items (Debits and Credits)
model JournalLine {
  id             String       @id @default(uuid())
  journalEntryId String
  accountId      String
  
  debit          Float        @default(0)
  credit         Float        @default(0)
  
  description    String?      // Line-level narration
  
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  account        Account      @relation(fields: [accountId], references: [id])
  
  @@index([journalEntryId])
  @@index([accountId])
}
```

### 2.2. Default Accounts (Seeding)
We will seed a standard Chart of Accounts:
- **Assets**: Cash, Bank HDFC, Bank SBI, Accounts Receivable, Inventory Asset.
- **Liabilities**: Accounts Payable, GST Payable, Duties & Taxes.
- **Equity**: Capital Account, Retained Earnings.
- **Income**: Sales Revenue, Other Income.
- **Expenses**: Cost of Goods Sold (COGS), Salary, Rent, Electricity, Office Expenses.

## 3. Integration Points

### 3.1. Sales (Invoices)
When an Invoice is **APPROVED/CREATED**:
- **Debit**: Accounts Receivable (Customer) - Total Amount
- **Credit**: Sales Revenue - Taxable Amount
- **Credit**: GST Payable - Tax Amount

### 3.2. Expenses
When an Expense is **CREATED/PAID**:
- **Debit**: Expense Account (Category-based) - Net Amount
- **Debit**: GST Input (if applicable) - Tax Amount
- **Credit**: Bank/Cash/Accounts Payable - Total Amount

### 3.3. Payments (In/Out)
- **Receive Payment**: Debit Bank/Cash, Credit Accounts Receivable.
- **Make Payment**: Debit Accounts Payable/Expense, Credit Bank/Cash.

## 4. Implementation Steps

1.  **Schema Migration**: Add the new models to `schema.prisma` and push changes.
2.  **Seeding**: Write a script to populate the initial `Account` list.
3.  **Journal Engine**: Create a service (`lib/accounting.ts`) with functions like `postJournalEntry()`.
4.  **Hook Integration**: Update `sales/actions.ts` and `expenses/actions.ts` to call the Journal Engine.
5.  **Reporting**: Build the Trial Balance and P&L pages using the new `JournalLine` data.
