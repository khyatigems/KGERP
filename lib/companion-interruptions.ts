"use client";
/** A bounded, account-scoped ledger. Web Locks serialize competing tabs. */
export async function claimCompanionInterruptions(userId: string, keys: string[], now = Date.now()): Promise<string[]> {
  const claim = () => {
    const key = `facet:interruptions:${userId}`;
    let ledger: { events: Record<string, number>; lastAt: number } = { events: {}, lastAt: 0 };
    try { const stored = JSON.parse(localStorage.getItem(key) || "null"); if (stored && typeof stored.lastAt === "number" && stored.events && typeof stored.events === "object") ledger = stored; } catch { /* Storage is optional. */ }
    if (now - ledger.lastAt < 30000) return [];
    const fresh = [...new Set(keys)].filter(id => !ledger.events[id] || now - ledger.events[id] > 86400000).slice(0, 5);
    if (!fresh.length) return [];
    fresh.forEach(id => { ledger.events[id] = now; });
    ledger.events = Object.fromEntries(Object.entries(ledger.events).filter(([, time]) => typeof time === "number" && now - time < 86400000).sort((a,b) => b[1] - a[1]).slice(0, 200));
    ledger.lastAt = now;
    try { localStorage.setItem(key, JSON.stringify(ledger)); } catch { /* In-memory session deduplication still applies. */ }
    return fresh;
  };
  return navigator.locks ? navigator.locks.request(`facet:interruptions:${userId}`, claim) : claim();
}

/** Remaining cooldown, so deferred candidates can be retried without polling. */
export function companionInterruptionDelay(userId: string, now = Date.now()) {
  try {
    const ledger = JSON.parse(localStorage.getItem(`facet:interruptions:${userId}`) || "null");
    return typeof ledger?.lastAt === "number" ? Math.max(0, Math.min(30000, ledger.lastAt + 30000 - now)) : 0;
  } catch { return 0; }
}
