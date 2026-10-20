// Pure interval functions shared with the executable tests. No URLs or page content persisted.
export function sliceInterval(previous, end, limit = 90000) {
  if (!previous || end <= previous.at || end - previous.at > limit) return null;
  return { id: crypto.randomUUID(), platform: previous.platform, domain: previous.domain, eventType: "ACTIVE", startedAt: new Date(previous.at).toISOString(), occurredAt: new Date(end).toISOString(), activityType: previous.activityType, classificationOverride: previous.classificationOverride };
}
export function removeIdle(events, cutoff) {
  return events.flatMap(e => {
    if (e.eventType !== "ACTIVE") return [e];
    const start = +new Date(e.startedAt), end = Math.min(+new Date(e.occurredAt), cutoff);
    return start < end ? [{ ...e, occurredAt: new Date(end).toISOString() }] : [];
  });
}
export function readyEvents(events, now, idleSeconds) {
  return events.filter(e => +new Date(e.occurredAt) <= now - (idleSeconds * 1000 + 90000));
}
export function acknowledge(events, ids) { const accepted = new Set(ids); return events.filter(e => !accepted.has(e.id)); }
