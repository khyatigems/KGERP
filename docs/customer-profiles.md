# Customer Profiles

## Overview
Customer Profiles provide a central repository of customer contact details that can be reused across Sales (Invoices) and Quotations to keep customer naming and contact information consistent.

## Access Control
- View: requires `customer.view`
- Create/Edit: requires `customer.manage`
- Export: requires `customer.export`

## Fields
Mandatory:
- Full Name
- Postal Address
- Primary Phone
- Secondary Phone
- Email

Optional:
- City, State, Country, Pincode
- PAN, GSTIN
- Notes

## How to Use
1. Go to Dashboard → Customers.
2. Click “Add Customer” to create a profile.
3. When creating a Sale or Quotation, select the customer from the customer search dropdown to auto-fill:
   - Name
   - Phone, Email
   - Address (where supported)

## Export
On Customers list:
- Use “Export Customers” to download Customer Profiles as CSV, Excel, or PDF.
