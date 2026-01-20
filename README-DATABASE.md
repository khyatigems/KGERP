
# Database Configuration & Safeguards

This project supports both local SQLite (`dev.db`) and remote LibSQL/Turso databases.

## ⚠️ Critical Configuration Warning

**Do not modify the `DATABASE_URL` in `.env` or `.env.local` without authorization.**
Changing the database URL will switch the data source and may cause data loss or visibility issues (e.g., "missing data" because the app is looking at a different database file).

## Current Configuration (Production/Shared Dev)

The project is currently configured to use a remote **Turso** database.
- **URL**: `libsql://kgerpv3-kgadmin.aws-ap-south-1.turso.io`
- **Adapter**: `@prisma/adapter-libsql` (Automatically used when URL starts with `libsql://`)

## Environment Files

- **`.env.local`**: High priority. Should contain the production/remote `DATABASE_URL` with the auth token.
- **`.env`**: Fallback. Should mirror `.env.local` or provide a safe default.

## Verification

To verify the database connection and data visibility, run:

```bash
npx tsx scripts/validate-db-connection.ts
```

## Troubleshooting "Missing Data"

If data appears to be missing:
1. Check if `DATABASE_URL` in `.env.local` is pointing to `file:./dev.db` (Local) instead of `libsql://...` (Remote).
2. Ensure the `authToken` in the Turso URL is valid.
3. Run the validation script to see which database is actually being connected to.
