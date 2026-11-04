// A device-selection hint only. Server ownership and signatures authorize unlock.
export function localUnlockDevice(userId?: string | null) {
  if (!userId) return undefined;
  try { return localStorage.getItem(`erp-app-unlock-device:${userId}`) || undefined; } catch { return undefined; }
}
export function rememberUnlockDevice(userId: string | undefined, credentialId: string) {
  if (!userId) return;
  try { localStorage.setItem(`erp-app-unlock-device:${userId}`, credentialId); } catch { /* Setup works without persistent selection hints. */ }
}
