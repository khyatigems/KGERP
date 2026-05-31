# eBay Regeneration Testing & Troubleshooting Guide

## Quick Test Steps

### 1. Start the Development Server
```bash
npm run dev
```

The server should start without errors. Watch for log messages like:
```
[Regenerate API] POST invoked
[Regenerate API] session: true <user-id>
[Regenerate API] permission result: { success: true }
```

### 2. Open the UI
- Navigate to Inventory page
- Click "Regenerate eBay HTML Descriptions" button

### 3. Expected Behavior
✅ Modal opens with "Start Regeneration" button
✅ Click the button → shows progress bar (0/0 initially)
✅ Progress updates: Updated: 0 → Updated: N
✅ Completes with success message

### 4. If You See 404 Error
Error message:
```
Failed to poll regeneration status
api/inventory/regenerate-ebay?taskId=... 404
```

**Check Server Console:**
```
[Regenerate API] POST invoked
[Regenerate API] Created task: <taskId>
[Regenerate API] Task saved to storage
[Regenerate API] Started background regeneration task

[Regenerate API] GET invoked with taskId: <taskId>
[Regenerate API] Task lookup result: FOUND ✓
```

If you see "NOT_FOUND", the issue is task storage.

---

## Detailed Diagnostics

### Check Database Connection
Run this script:
```bash
DATABASE_URL="file:./dev.db" node scripts/verify-migration.mjs
```

Expected output:
```
✅ Table exists: regeneration_tasks
📋 Table schema:
  • id: TEXT
  • status: TEXT NOT NULL DEFAULT 'PENDING'
  ...
✅ Migration successful!
```

### Test Task Storage
Run:
```bash
DATABASE_URL="file:./dev.db" node scripts/debug-regeneration.mjs
```

Expected output:
```
✓ Table exists: YES
✓ Tasks in database: 0
🧪 Testing insert...
✓ Inserted test task: test-<timestamp>
✓ Test task found in database
✓ Test task cleaned up
```

### Check Server Logs During Regeneration
Watch the console output while clicking "Start Regeneration":

```
[Regenerate API] POST invoked
[Regenerate API] session: true <user-id>
[Regenerate API] permission result: { success: true }
[Regenerate API] Created task: <uuid>
[Regenerate API] Task saved to storage        ← Should see this
[Regenerate API] Started background regeneration task

[Regenerate eBay HTML] Started task: <uuid>
[Regenerate eBay HTML] Fetching inventory items
[Regenerate eBay HTML] Processing item 1/N
...
[Regenerate eBay HTML] Task completed: N updated, 0 failed
```

---

## Common Issues & Solutions

### Issue 1: 404 on First Poll
**Symptom:** POST succeeds but GET returns 404

**Causes:**
- Task not being saved to memory
- DATABASE_URL not set
- Prisma connection issues

**Solutions:**
1. Check server console for errors in POST response
2. Ensure DATABASE_URL is set: `echo $env:DATABASE_URL`
3. Restart dev server with: `DATABASE_URL="file:./dev.db" npm run dev`

### Issue 2: Progress Doesn't Update
**Symptom:** Modal shows "0/0" and stays stuck

**Causes:**
- Background task not starting
- Task polling fails silently

**Solutions:**
1. Check server console for runRegenerationTask errors
2. Verify inventory items exist
3. Check if eBay settings are configured

### Issue 3: productDescription Errors
**Symptom:** "Invalid Prisma invocation: no such column: productDescription"

**Causes:**
- Database schema not updated
- Migration not run
- Prisma cache stale

**Solutions:**
1. Run migration: `DATABASE_URL="file:./dev.db" node scripts/migrate-regeneration-tasks.mjs`
2. Verify schema: `DATABASE_URL="file:./dev.db" node scripts/verify-migration.mjs`
3. Clear Prisma cache: `rm -rf node_modules/.prisma`

---

## Architecture Overview

### In-Memory Cache
```typescript
const regenerationTasks = new Map<string, RegenerationTask>();
```
- Fast lookup
- Survives within same process
- Lost on server restart

### Database Storage
```sql
CREATE TABLE regeneration_tasks (
  id TEXT PRIMARY KEY,
  status TEXT,
  total/updated/failed/pending INTEGER,
  errors TEXT (JSON),
  startTime/endTime INTEGER,
  message TEXT
)
```
- Persistent across restarts
- Survives multiple requests
- Fallback if process crashes

### Dual-Write Strategy
1. Task is saved to **both** in-memory Map AND database
2. GET request checks:
   - In-memory first (fastest)
   - Database second (persistent)
   - Returns from whichever has it
3. If DB save fails, task still works from memory

---

## Performance Expectations

| Metric | Expected |
|--------|----------|
| POST response time | <100ms |
| GET response time | <50ms (memory) or <200ms (DB) |
| Full regeneration | ~2-5 seconds for 50 items |
| Poll interval | 1.2 seconds |

---

## Monitoring

Add this to your logs/monitoring:
```
[Regenerate API] POST invoked → Created task
[Regenerate API] GET invoked → Task lookup result
[Regenerate eBay HTML] Processing item X/N → Monitor progress
[Regenerate eBay HTML] Task completed → Track success rate
```

Look for patterns:
- Too many "NOT_FOUND" errors → storage issue
- "Processing item" stops → background task crashed
- Long times between polls → polling issues

---

## Reset/Cleanup

If tasks get stuck:
```bash
# Clear in-memory: restart server
npm run dev

# Clear database:
DATABASE_URL="file:./dev.db" node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$executeRawUnsafe('DELETE FROM regeneration_tasks').then(() => p.\$disconnect());
"
```
