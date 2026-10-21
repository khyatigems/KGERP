/** Aggregate effective report rows, after overlap removal and timezone splitting. */
export function activitySummary(rows: { sessionId: string; day: string; platform: string; activityType: string; seconds: number }[]) {
 const groups = new Map<string, { day: string; platform: string; activityType: string; seconds: number; ids: Set<string> }>();
 for (const row of rows) {
  if (row.seconds <= 0) continue;
  const key = JSON.stringify([row.day, row.platform, row.activityType]);
  const group = groups.get(key) || { day: row.day, platform: row.platform, activityType: row.activityType, seconds: 0, ids: new Set<string>() };
  group.seconds += row.seconds; group.ids.add(row.sessionId); groups.set(key, group);
 }
 return [...groups.values()].map(({ ids, ...group }) => ({ ...group, intervalCount: ids.size })).sort((a,b) => b.day.localeCompare(a.day) || b.seconds-a.seconds || a.platform.localeCompare(b.platform));
}
