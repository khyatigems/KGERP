export function normalizeDateToUtcNoon(date: Date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  return new Date(Date.UTC(y, m, d, 12, 0, 0, 0));
}
