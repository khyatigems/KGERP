"use client";
import { useState } from "react";
import { useAppLock } from "@/components/auth/app-lock-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppLockSettings() {
  const lock = useAppLock();
  const [password, setPassword] = useState("");
  if (!lock) return null;
  return <section className="space-y-4 rounded-xl border bg-card p-5">
    <h2 className="text-lg font-semibold">2. Fingerprint app lock</h2>
    <p className="text-sm text-muted-foreground">ERP locks after 1 minute in the background. Quick Alt+Tab switches, table filters, dropdowns, and normal page navigation keep you unlocked. After a longer absence, verify with your device fingerprint, face, or PIN. Lock now always locks immediately.</p>
    <p role="status" className="text-sm font-medium">{lock.state?.enabled ? "App lock is on for this browser session." : "App lock is off for this browser session."}</p>
    {!lock.state?.supported && <p className="text-sm text-muted-foreground">Sign out and sign in again if app lock is unavailable.</p>}
    {!lock.state?.enabled && <Button disabled={lock.busy || !lock.state?.supported} onClick={lock.enable}>{lock.busy ? "Verifying…" : "Enable fingerprint app lock"}</Button>}
    {lock.state?.enabled && <div className="space-y-3"><Button variant="outline" disabled={lock.busy} onClick={lock.lock}>Lock now</Button><label className="block space-y-1 text-sm"><span>Current password to turn app lock off</span><Input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label><Button variant="outline" disabled={lock.busy || !password} onClick={async () => { await lock.disable(password); setPassword(""); }}>Turn off app lock</Button></div>}
    {lock.message && <p role="status" className="text-sm">{lock.message}</p>}
    <p className="text-xs text-muted-foreground">Set up this device above before enabling. A registered phone does not configure Windows Hello on your computer. Other browsers and devices are configured separately. Signing out ends this session; after normal login, enable app lock again if needed.</p>
  </section>;
}
