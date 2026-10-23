"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Reply = { ok?: boolean; error?: string; connected?: boolean; browserName?: string };
type Runtime = { sendMessage: (id: string, message: unknown, callback: (reply?: Reply) => void) => void; lastError?: { message?: string } };
const publishedId = process.env.NEXT_PUBLIC_WORK_TRACKER_EXTENSION_ID || "";
const field = "w-full rounded-lg border bg-background px-3 py-2 text-sm";
function send(id: string, message: unknown): Promise<Reply> {
 return new Promise((resolve, reject) => {
  const runtime = (window as Window & { chrome?: { runtime?: Runtime } }).chrome?.runtime;
  if (!runtime || !/^[a-p]{32}$/.test(id)) { reject(new Error("Install or reload the extension and enter its ID from chrome://extensions if using Load unpacked.")); return; }
  const timer = setTimeout(() => reject(new Error("Extension did not respond. Check that it is installed and enabled.")), 15000);
  runtime.sendMessage(id, message, reply => {
   clearTimeout(timer);
   const error = runtime.lastError;
   if (error || !reply) reject(new Error(error?.message || "Extension unavailable"));
   else if (reply.error) reject(new Error(reply.error)); else resolve(reply);
  });
 });
}
async function request(path: string, method: string, body: unknown) {
 const response = await fetch(`/api/work-tracker/${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
 const result = await response.json(); if (!response.ok) throw new Error(result.error || "Connection failed"); return result;
}
export function BrowserConnection({ onConnected }: { onConnected: () => Promise<void> }) {
 const [id, setId] = useState(publishedId), [name, setName] = useState(""), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
 async function connect() {
  setBusy(true); setMessage("");
  try {
   const state = await send(id, { action: "erp-status" });
   if (state.connected) { setMessage(`Already connected as ${state.browserName || "this Chrome profile"}. Use extension Settings to disconnect before replacing its credential.`); return; }
   const credential = await request("credentials", "POST", { name: name.trim() });
   try {
    await send(id, { action: "erp-connect", erpUrl: window.location.origin, token: credential.token, browserName: name.trim(), credentialId: credential.id });
   } catch (error) {
    // A lost response may mean the extension saved the token. Revoke it anyway;
    // never leave an unreviewed active credential after a failed handshake.
    try { await request(`credentials/${credential.id}`, "DELETE", {}); }
    catch { throw new Error("Connection failed and cleanup failed. Revoke the new browser credential below before retrying."); }
    throw error;
   }
   setMessage(`Connected as ${name.trim()}. Open the extension and enable automatic tracking.`);
  } catch (error) { setMessage(error instanceof Error ? error.message : "Connection failed"); }
  finally { await onConnected().catch(() => {}); setBusy(false); }
 }
 return <div className="space-y-3 rounded-xl border p-4">
  <h3 className="text-sm font-semibold">Install and connect this browser</h3>
  {publishedId ? <a className="inline-block text-sm font-medium underline" href={`https://chromewebstore.google.com/detail/${publishedId}`} target="_blank" rel="noopener noreferrer">Install Chrome extension</a> : <p className="text-sm text-muted-foreground">Store publication is pending. For now, build the extension and use Load unpacked in chrome://extensions.</p>}
  {!publishedId && <label className="block text-sm">Extension ID<input className={field} value={id} onChange={e => setId(e.target.value.trim())} placeholder="Copy ID from chrome://extensions" autoComplete="off" /></label>}
  <label className="block text-sm">Browser name<input className={field} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Office PC — Etsy" /></label>
  <p className="text-xs text-muted-foreground">Creates a personal 90-day credential and saves it directly in this Chrome profile. Tracking stays paused until you enable it in the extension.</p>
  <Button disabled={busy || !name.trim() || !/^[a-p]{32}$/.test(id)} onClick={connect}>{busy ? "Connecting…" : "Connect this browser"}</Button>
  <p role="status" className="text-sm">{message}</p>
 </div>;
}
