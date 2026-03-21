# QR & Link Analytics report

## Features
- Pagination with page sizes: 10 / 25 / 50 / 100
- Search across identifier, IP, user-agent, and details
- Date range filtering
- Sorting (newest/oldest)
- CSV export (up to 10,000 rows) matching the current filters

## Export
- Endpoint: `/api/reports/qr-scans/export`
- Uses the same query parameters as the UI: `q`, `from`, `to`, `sort`

