# Marketplace sync recovery

On November 3, 2026, a KhyatiGemsOfficial listing write failed with
`SQLITE_BUSY: database is locked`. The stored error identifies writer contention,
but does not identify the operation holding the lock.

The manual retry created a new job starting at the previous job's terminal cursor
100, with zero saved counters and a new creation timestamp. Its empty final page
incorrectly reconciled 89 earlier listings as inactive. Separately, the sync
skipped 10 listings marked SOLD locally even though Etsy returned them as active.
The repaired live data contains 100 active listings. Inventory and sale records
were not changed.

## Safeguards

- Manual retries begin at page zero, with duplicate selections consolidated and
  an existing active sync checked before queueing.
- Cron and browser-triggered workers share a database-backed global lease. Only
  one marketplace queue worker runs at a time across application instances.
  The five-minute lease exceeds both sync routes' 60-second runtime limit and
  expires after a terminated process. Owner-qualified deletion prevents another
  worker's lease from being released. This is an application lease, not a database
  transaction held open while calling external APIs.
- Atomic listing, order, item, sync-log, job-progress and listing-closure writes
  retry SQLite BUSY/LOCKED errors with bounded exponential backoff and jitter.
  Network errors are not blindly retried because their commit outcome may be
  ambiguous.
- Exhausted row lock retries fail the page. Its cursor and counters stay unchanged
  and the existing job retry mechanism replays that page. Persistent failures
  retain the existing failure notification and history behavior.
- A listing job's cursor must equal its saved scanned count before any page is
  fetched. Missing-listing reconciliation only runs after the final successful
  page and when no records failed in the crawl.
- Current marketplace listing availability refreshes locally SOLD listing rows.
  This does not change ERP inventory or sales.

Other ERP writes may still briefly contend with a sync. These safeguards reduce
contention and safely retry or report failures; they cannot eliminate every
database outage or lock. Direct administrative scripts calling sync functions
outside the queue do not participate in its worker lease.

Deploy the application changes to enable these safeguards on the hosted app.
The existing additive WorkerLockHeartbeat schema helper supplies the lease table;
no destructive migration is needed. Keep the lease longer than the maximum route
runtime if deployment limits change.

Run `npm run test:marketplace-sync-resilience`. Tests use isolated SQLite databases
and cover independent worker connections, lease cleanup and expiry, page retry,
incomplete-crawl protection, lock retry bounds, persistence and price-history
rollback, and refreshing locally SOLD listings from the active feed.
