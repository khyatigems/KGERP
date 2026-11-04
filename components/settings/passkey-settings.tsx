"use client";
import { useEffect, useRef, useState } from "react";
import { browserSupportsWebAuthn, platformAuthenticatorIsAvailable, startRegistration } from "erp-webauthn-browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function passkeyRequest(body: unknown) {
  const response = await fetch("/api/auth/passkeys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Passkey request failed.");
  return data;
}
type Key = { id: string; name: string; createdAt: string; lastUsedAt: string | null };
export function PasskeySettings({ prompt = false }: { prompt?: boolean }) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  async function load() {
    const response = await fetch("/api/auth/passkeys", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setKeys(data.keys);
    return data;
  }
  useEffect(() => {
    let active = true;
    (async () => {
      if (!window.isSecureContext || !browserSupportsWebAuthn()) return;
      const data = await load();
      if (!active) return;
      setAvailable(true);
      // A touch-oriented mobile device plus an available platform authenticator;
      // screen width alone must not trigger enrollment on desktop windows.
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (prompt && window.location.pathname !== "/settings/security" && data.recentLogin !== false && mobile && data.keys.length === 0 && data.promptAfter !== "never" && Number(data.promptAfter) <= Date.now() && await platformAuthenticatorIsAvailable() && active) setOpen(true);
    })().catch(error => { if (!prompt && active) setMessage(error.message); });
    return () => { active = false; };
  }, [prompt]);
  async function defer(preference: "later" | "never") {
    setBusy(true); setMessage("");
    try { await passkeyRequest({ action: "preference", preference }); setOpen(false); setPassword(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save preference."); }
    finally { setBusy(false); }
  }
  async function enroll() {
    setBusy(true); setMessage("");
    try {
      const optionsJSON = await passkeyRequest({ action: "register-options", password, name });
      const response = await startRegistration({ optionsJSON });
      await passkeyRequest({ action: "register-verify", response });
      setPassword(""); await load(); setOpen(false); setMessage("Passkey added for app unlock. Enable fingerprint app lock in Security Settings to lock ERP when you leave it.");
    } catch (error) { setMessage(error instanceof Error && error.name === "NotAllowedError" ? "Enrollment cancelled or timed out. You can try again." : error instanceof Error ? error.message : "Could not add passkey."); }
    finally { setBusy(false); }
  }
  const content = <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Your fingerprint stays on your device. Your phone or laptop may also offer face recognition or a device PIN. Existing verification and recovery methods remain available.</p>
    {!prompt && keys.map(key => <div key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="font-medium">{key.name}</p><p className="text-xs text-muted-foreground">Added {new Date(key.createdAt).toLocaleDateString()} · {key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : "Not used yet"}</p></div><Button variant="outline" disabled={busy || !password} onClick={async () => {
      setBusy(true); setMessage("");
      try { await passkeyRequest({ action: "remove", id: key.id, password }); setPassword(""); await load(); setMessage("Passkey removed from ERP."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove passkey."); }
      finally { setBusy(false); }
    }}>Remove</Button></div>)}
    <label className="block space-y-1 text-sm"><span>Current password</span><Input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} disabled={busy} /></label>
    <label className="block space-y-1 text-sm"><span>Passkey name</span><Input placeholder="e.g. My phone or office laptop" maxLength={80} value={name} onChange={event => setName(event.target.value)} disabled={busy} /></label>
    <Button onClick={enroll} disabled={busy || !password || !available}>{busy ? "Please wait…" : keys.length ? "Add another passkey" : "Enable now"}</Button>
    {prompt && <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={() => defer("later")}>Remind me in 7 days</Button><Button variant="ghost" disabled={busy} onClick={() => defer("never")}>Don’t ask again</Button></div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
  if (prompt) return <Dialog open={open} onOpenChange={value => { if (!value && !busy) void defer("later"); }}><DialogContent tone="confirmation" showCloseButton={!busy} onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }}><DialogHeader><DialogTitle ref={titleRef} tabIndex={-1}>Set up fingerprint app unlock?</DialogTitle><DialogDescription>Register your device to unlock ERP when you return. Your normal login stays the same.</DialogDescription></DialogHeader>{content}</DialogContent></Dialog>;
  return <section className="space-y-4 rounded-xl border bg-card p-5"><h2 className="text-lg font-semibold">Passkeys &amp; fingerprint unlock</h2>{!available && <p className="text-sm">Passkeys require a supported browser and the configured secure ERP address.</p>}{content}<Button variant="ghost" disabled={busy || !available} onClick={async () => { try { await passkeyRequest({ action: "preference", preference: "reset" }); setMessage("Mobile enrollment reminders enabled."); } catch { setMessage("Could not update reminders."); } }}>Enable mobile enrollment reminders</Button></section>;
}
