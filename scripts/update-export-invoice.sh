#!/bin/bash
# Update invoice to export invoice type
# Usage: ./update-export-invoice.sh [invoice_number]

INVOICE_NUMBER=${1:-"INV-2026-0020"}
DB_PATH=${2:-"prisma/dev.db"}

echo "Updating invoice $INVOICE_NUMBER to EXPORT_INVOICE..."

sqlite3 "$DB_PATH" <<EOF
UPDATE Invoice SET 
  invoiceType = 'EXPORT_INVOICE',
  exportType = 'LUT',
  countryOfDestination = 'International'
WHERE invoiceNumber = '$INVOICE_NUMBER';

SELECT 
  invoiceNumber, 
  invoiceType, 
  exportType, 
  countryOfDestination 
FROM Invoice 
WHERE invoiceNumber = '$INVOICE_NUMBER';
EOF

echo "Done!"
