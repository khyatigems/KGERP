export const APP_LOCK_GRACE_MS = 60_000;
// Active tabs renew every 20 seconds. Leave a scheduling/network margin; an
// explicit background suspension shortens the grant to the actual grace period.
export const APP_LOCK_LEASE_MS = APP_LOCK_GRACE_MS + 30_000;
