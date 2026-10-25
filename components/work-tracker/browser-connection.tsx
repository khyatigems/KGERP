"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useErpConfirmation } from "@/components/providers/erp-confirmation-provider";
import { browserConnectionAction, type BrowserStatus } from "@/lib/work-tracker/browser-connection-state";
import type { Credential } from "./types";

type Reply = Partial<BrowserStatus> & { ok?: boolean; error?: string };
type Runtime = { sendMessage: (id: string, message: unknown, callback: (reply?: Reply) => void) => void; lastError?: { message?: string } };
const publishedId = process.env.NEXT_PUBLIC_WORK_TRACKER_EXTENSION_ID || "";
const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
const validId = (id: string) => /^[a-p]{32}$/.test(id);

function send(id: string, message: unknown): Promise<Reply> {
 return new Promise((resolve, reject) => {
  const runtime = (window as Window & { chrome?: { runtime?: Runtime } }).chrome?.runtime;
  if (!runtime || !validId(id)) { reject(new Error("Load the extension in Chrome, reload this ERP page, and check the extension ID.")); return; }
  let settled = false;
  const finish = (error?: Error, reply?: Reply) => {
   if (settled) return; settled = true; clearTimeout(timer);
   if (error) reject(error); else resolve(reply!);
  };
  const timer = setTimeout(() => finish(new Error("Chrome did not respond. Check the extension is enabled, then try Check this browser again.")), 45000);
  try {
   runtime.sendMessage(id, message, reply => {
    const error = runtime.lastError;
    if (error || !reply) finish(new Error("Extension unavailable. Check it is enabled in chrome://extensions, then reload this ERP page."));
    else if (reply.error) finish(new Error(reply.error));
    else if (!reply.ok || reply.protocol !== 2) finish(new Error("This extension is an older version. Download the current extension above, replace the files in its existing folder, and click Reload in chrome://extensions."));
    else finish(undefined, reply);
   });
  } catch (error) { finish(error instanceof Error ? error : new Error("Chrome connection failed")); }
 });
}
async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
 const response = await fetch(`/api/work-tracker/${path}`, { method, cache: "no-store", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
 const result = await response.json(); if (!response.ok) throw new Error(result.error || "Connection failed"); return result;
}

export function BrowserConnection({ credentials, onConnected, zone }: { credentials: Credential[]; onConnected: () => Promise<void>; zone: string }) {
 const confirm = useErpConfirmation();
 const [id, setId] = useState(publishedId), [name, setName] = useState("");
 const [status, setStatus] = useState<BrowserStatus | null>(null), [owned, setOwned] = useState(false);
 const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
 const [editing, setEditing] = useState<string | null>(null), [rename, setRename] = useState("");
 const locked = useRef(false);
 useEffect(() => {
  if (!publishedId) { try { const saved = localStorage.getItem("work-tracker-extension-id"); if (saved && validId(saved)) setId(saved); } catch { /* Storage disabled */ } }
 }, []);
 const action = browserConnectionAction(status, owned);
 const active = credentials.filter(c => !c.revokedAt && +new Date(c.expiresAt) > Date.now());
 const history = credentials.filter(c => c.revokedAt || +new Date(c.expiresAt) <= Date.now());
 const date = (value: string) => new Date(value).toLocaleDateString("en-IN", { timeZone: zone, day: "numeric", month: "short", year: "numeric" });

 async function run(task: () => Promise<void>) {
  if (locked.current) return; locked.current = true; setBusy(true); setError(""); setMessage("");
  try { await task(); }
  catch (e) { setError(e instanceof Error ? e.message : "Connection failed"); }
  finally {
   try { await onConnected(); } catch { setError(previous => previous || "Browser action completed, but the list could not refresh. Refresh the page."); }
   locked.current = false; setBusy(false);
  }
 }
 async function inspect() {
  setStatus(null); setOwned(false);
  const [reply, current] = await Promise.all([send(id, { action: "erp-status" }), request<Credential[]>("credentials")]);
  const next = reply as BrowserStatus;
  if (!next.state || (next.state === "connected" && !next.credentialId)) throw new Error("Unexpected extension response. Update the extension using the download above, then reload it.");
  const mine = next.state === "connected" && current.some(c => c.id === next.credentialId && !c.revokedAt && +new Date(c.expiresAt) > Date.now());
  setStatus(next); setOwned(mine);
  if (next.connected && mine) setName(next.browserName || "");
  try { localStorage.setItem("work-tracker-extension-id", id); } catch { /* Storage disabled */ }
  return { next, mine };
 }
 async function connect() {
  // Recheck just before minting; a stale page must never replace working access.
  const { next, mine } = await inspect();
  if (browserConnectionAction(next, mine) !== "connect") return;
  if (!name.trim()) throw new Error("Enter a browser name.");
  const credential = await request<{ id: string; token: string }>("credentials", "POST", { name: name.trim() });
  try {
   const reply = await send(id, { action: "erp-connect", erpUrl: window.location.origin, token: credential.token, browserName: name.trim(), credentialId: credential.id });
   if (reply.credentialId !== credential.id) throw new Error("Chrome did not confirm the new connection.");
  } catch (e) {
   try { await request(`credentials/${credential.id}`, "DELETE", {}); }
   catch { throw new Error("Connection failed and the new access could not be revoked. Revoke it in Browser access below before retrying."); }
   setStatus(null);
   throw new Error(`${e instanceof Error ? e.message : "Connection failed"} The new access was revoked. Check this browser before retrying.`);
  }
  setStatus({ protocol: 2, state: "connected", connected: true, credentialId: credential.id, browserName: name.trim(), enabled: false, pendingCount: 0 }); setOwned(true);
  setMessage("Connected. Open the extension popup and enable automatic tracking.");
 }
 async function saveName(credentialId: string, value: string) {
  await request(`credentials/${credentialId}`, "PATCH", { name: value.trim() });
  if (status?.credentialId === credentialId) {
   setStatus({ ...status, browserName: value.trim() }); setName(value.trim());
   try { await send(id, { action: "erp-status" }); }
   catch { setEditing(null); setMessage("Browser name saved in ERP. Check this browser again to refresh its name in Chrome."); return; }
  }
  setEditing(null); setMessage("Browser name updated. Its existing access stays the same.");
 }
 const statusText = !status ? "Check this browser to see whether it needs a connection." : status.state === "connected"
  ? owned ? `Connected as ${status.browserName}. ${status.enabled ? "Automatic tracking enabled." : "Tracking paused. Enable it in the extension popup."}` : "Chrome is connected to another ERP account. Disconnect in extension Settings before connecting this account."
  : status.state === "invalid" ? status.pendingCount || status.enabled ? "The saved access has expired or been revoked. Pause tracking and resolve any pending records in extension Settings before reconnecting." : "The saved access has expired or been revoked. Reconnect this browser below."
  : status.state === "other-erp" ? "Chrome is connected to another ERP address. Disconnect in extension Settings before switching."
  : status.state === "unreachable" ? "The saved connection could not be verified. Check your network and ERP, then retry. No new access was created."
  : status.state === "update-required" ? "Update the ERP and extension together, then check again."
  : "Extension found. Give this browser a name and connect it once.";

 return <div className="space-y-5">
  <section className="space-y-4 rounded-xl border p-4 sm:p-5">
   <div><h3 className="text-base font-semibold">This Chrome browser</h3><p className="mt-1 text-sm text-muted-foreground">One connection per Chrome profile. Give each browser a name you recognize.</p></div>
   <details className="rounded-lg bg-muted/30 p-3 text-sm"><summary className="cursor-pointer font-medium">Install or update the free extension</summary>
    {publishedId ? <a className="mt-3 inline-block underline" href={`https://chromewebstore.google.com/detail/${publishedId}`} target="_blank" rel="noopener noreferrer">Open Chrome Web Store</a> : <><a className="mt-3 inline-block font-medium underline" href="/downloads/work-tracker-extension.zip" download>Download Chrome extension</a><ol className="mt-3 list-decimal space-y-2 pl-5"><li>Download and extract the ZIP into a permanent folder on this computer.</li><li>Open <code>chrome://extensions</code>, enable Developer mode, select Load unpacked and choose the extracted folder containing <code>manifest.json</code>.</li><li>For updates, replace the files in that same folder and click Reload on the extension. Reload this ERP page afterward.</li><li>Copy the extension ID below. No payment or store account is needed.</li></ol></>}
   </details>
   {!publishedId && <label className="block space-y-1 text-sm"><span>Extension ID</span><input className={field} disabled={busy} value={id} onChange={e => { setId(e.target.value.trim()); setStatus(null); setOwned(false); setError(""); setMessage(""); }} placeholder="Copy ID from chrome://extensions" autoComplete="off" spellCheck={false} /><span className="block text-xs text-muted-foreground">Remembered on this browser for your next visit.</span></label>}
   <Button variant="outline" disabled={busy || !validId(id)} onClick={() => run(async () => { await inspect(); })}>{busy ? "Working..." : "Check this browser"}</Button>
   <div className="space-y-2 rounded-lg bg-muted/30 p-3 text-sm" role="status"><p>{statusText}</p>{status?.pendingCount ? <p>{status.pendingCount} pending records. Before switching access, pause tracking, sync or export and clear these records in extension Settings.</p> : null}{owned && status?.lastSync && <p className="text-xs text-muted-foreground">Last successful upload from this profile: {new Date(status.lastSync).toLocaleString("en-IN", { timeZone: zone })}</p>}</div>
   {(action === "connect" || action === "rename") && <div className="space-y-3"><label className="block space-y-1 text-sm"><span>Browser name</span><input className={field} maxLength={80} disabled={busy} value={name} onChange={e => setName(e.target.value)} placeholder="Office PC - Etsy" /></label>
    <Button disabled={busy || !name.trim() || (action === "rename" && name.trim() === status?.browserName)} onClick={() => run(() => action === "rename" ? saveName(status!.credentialId!, name) : connect())}>{action === "rename" ? "Save browser name" : status?.state === "invalid" ? "Reconnect this browser" : "Connect this browser"}</Button>
    <p className="text-xs text-muted-foreground">{action === "rename" ? "Renaming keeps the existing connection and does not create another access key." : "Saves a personal 90-day access key directly in Chrome. No copying required. Tracking starts only when you enable it in the extension popup."}</p></div>}
   {status && <Button variant="ghost" disabled={busy} onClick={() => run(async () => { await send(id, { action: "erp-open-settings" }); })}>Open extension Settings</Button>}
   {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm">{message}</p>}
  </section>
  <section className="space-y-3"><div><h3 className="text-sm font-semibold">Browser access</h3><p className="mt-1 text-xs text-muted-foreground">{active.length} active access {active.length === 1 ? "key" : "keys"}. Access keys do not indicate whether a browser is currently online.</p></div>
   {!active.length && <p className="text-sm text-muted-foreground">No active browser access yet.</p>}
   <div className="divide-y">{active.map(c => <div className="flex flex-wrap items-center justify-between gap-3 py-3" key={c.id}>
    <div className="min-w-0"><p className="break-words text-sm font-medium">{c.name}{owned && status?.credentialId === c.id && <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">This browser</span>}</p><p className="mt-1 text-xs text-muted-foreground">Access {c.id.slice(-8)} · expires {date(c.expiresAt)}</p></div>
    {editing === c.id ? <div className="flex w-full flex-wrap gap-2"><input aria-label={`New name for ${c.name}`} className={`${field} sm:w-64`} maxLength={80} value={rename} disabled={busy} onChange={e => setRename(e.target.value)} /><Button size="sm" disabled={busy || !rename.trim()} onClick={() => run(() => saveName(c.id, rename))}>Save name</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>Cancel</Button></div> : <div className="flex gap-2">{!(owned && status?.credentialId === c.id) && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setEditing(c.id); setRename(c.name); }}>Rename</Button>}<Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => {
     if (!await confirm({ title: `Revoke access for ${c.name}?`, description: "This access key will stop working. Uploaded activity stays in ERP. Unsent records remain in Chrome and may need to be exported before reconnecting.", confirmLabel: "Revoke access", destructive: true })) return;
     await request(`credentials/${c.id}`, "DELETE", {});
     if (status?.credentialId === c.id) { setStatus({ ...status, state: "invalid", connected: false }); setOwned(false); }
     setMessage("Browser access revoked.");
    })}>Revoke</Button></div>}
   </div>)}</div>
   {!!history.length && <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm">Previous access ({history.length} expired or revoked)</summary><div className="mt-2 divide-y">{history.map(c => <div className="py-3" key={c.id}><p className="text-sm">{c.name}</p><p className="text-xs text-muted-foreground">Access {c.id.slice(-8)} · {c.revokedAt ? "Revoked" : "Expired"} · expiry {date(c.expiresAt)}</p></div>)}</div></details>}
  </section>
 </div>;
}
