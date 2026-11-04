"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { startAuthentication } from "erp-webauthn-browser";
import { Fingerprint, LockKeyhole, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { isPublicPage } from "@/lib/public-routes";
import { appLockExempt, safeAppReturn } from "@/lib/security/app-lock-paths";

type LockStatus = { enabled: boolean; locked: boolean; supported: boolean; hasPasskeys: boolean };
type LockContext = { state: LockStatus | null; busy: boolean; message: string; enable: () => Promise<void>; disable: (password: string) => Promise<void>; lock: () => void };
const Context = createContext<LockContext | null>(null);
export function useAppLock() { return useContext(Context); }

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();
  const publicPage = isPublicPage(pathname);
  const [state, setState] = useState<LockStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const stateRef = useRef<LockStatus | null>(null);
  const verifying = useRef(false);
  const nativeFetch = useRef<typeof fetch | null>(null);
  const lastHeartbeat = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const readyOnce = useRef(false);
  const lockEpoch = useRef(0);
  const navigatingAfterUnlock = useRef(false);
  const update = useCallback((next: LockStatus) => { stateRef.current = next; setState(next); }, []);
  const request = useCallback(async (body?: unknown) => {
    const response = await (nativeFetch.current || fetch)("/api/auth/app-lock", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" } : { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to check app lock.");
    return data;
  }, []);
  const lock = useCallback(() => {
    if (!stateRef.current?.enabled) return;
    lockEpoch.current += 1;
    // Hide synchronously before the browser takes a background/BFCache snapshot.
    document.documentElement.dataset.erpAppLocked = "true";
    const wasLocked = stateRef.current.locked;
    update({ ...stateRef.current, locked: true });
    if (!wasLocked) {
      channel.current?.postMessage("locked");
      // keepalive survives normal tab/window close. A server lease bounds the
      // exposure if the OS kills the process before delivering this request.
      void (nativeFetch.current || fetch)("/api/auth/app-lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "lock" }), keepalive: true }).catch(() => {});
    }
  }, [update]);

  useEffect(() => {
    const original = window.fetch.bind(window);
    nativeFetch.current = original;
    const guarded: typeof fetch = async (input, init) => {
      const target = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
      const privateRequest = target.origin === location.origin && !appLockExempt(target.pathname);
      if (privateRequest && stateRef.current?.enabled && stateRef.current.locked) return new Response(JSON.stringify({ error: "ERP is locked.", code: "APP_LOCKED" }), { status: 423, headers: { "Content-Type": "application/json" } });
      const response = await original(input, init);
      if (privateRequest && stateRef.current?.enabled && (response.status === 423 || response.status === 503)) lock();
      return response;
    };
    window.fetch = guarded;
    return () => { if (window.fetch === guarded) window.fetch = original; };
  }, [lock]);

  useEffect(() => {
    if (pathname === "/unlock" && status === "unauthenticated") location.replace("/login");
    if (!publicPage && status === "unauthenticated" && stateRef.current?.enabled) lock();
    if (publicPage || status !== "authenticated") return;
    let active = true;
    const epoch = lockEpoch.current;
    void request().then((data: LockStatus) => {
      if (!active || epoch !== lockEpoch.current) return;
      if (!data.enabled || !data.locked) readyOnce.current = true;
      update(data); lastHeartbeat.current = Date.now();
      document.documentElement.dataset.erpAppLocked = data.enabled && data.locked ? "true" : "false";
      if (pathname === "/unlock" && !data.enabled) location.replace(safeAppReturn(new URLSearchParams(location.search).get("next")));
    }).catch(error => { if (active) { setMessage(error.message); if (stateRef.current?.enabled) lock(); } });
    return () => { active = false; };
  }, [status, publicPage, pathname, request, update, lock]);

  useEffect(() => {
    function hide() { if (document.hidden && !verifying.current && !navigatingAfterUnlock.current) lock(); }
    function pagehide() { if (!navigatingAfterUnlock.current) lock(); }
    function pageshow(event: PageTransitionEvent) { if (event.persisted) lock(); }
    function focus() { if (!verifying.current && stateRef.current?.enabled && Date.now() - lastHeartbeat.current > 45000) lock(); }
    function blur() { if (!verifying.current && !navigatingAfterUnlock.current) lock(); }
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    document.addEventListener("resume", pagehide);
    try {
      channel.current = new BroadcastChannel("erp-app-lock");
      channel.current.onmessage = event => {
        if (event.data === "locked") lock();
        if (event.data === "changed") {
          const epoch = lockEpoch.current;
          void request().then((data: LockStatus) => { if (epoch === lockEpoch.current) { update(data); if (data.enabled) lock(); } }).catch(() => lock());
        }
      };
    } catch { /* Server enforcement also applies when channels are unavailable. */ }
    const timer = setInterval(() => {
      if (!stateRef.current?.enabled || stateRef.current.locked || document.hidden || verifying.current || navigatingAfterUnlock.current) return;
      void request({ action: "heartbeat" }).then(() => { lastHeartbeat.current = Date.now(); }).catch(() => lock());
    }, 20000);
    return () => {
      document.removeEventListener("visibilitychange", hide); document.removeEventListener("resume", pagehide);
      window.removeEventListener("pagehide", pagehide); window.removeEventListener("pageshow", pageshow); window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      clearInterval(timer); channel.current?.close(); channel.current = null;
    };
  }, [lock, request, update]);

  async function verify(enable = false) {
    if (verifying.current) return;
    verifying.current = true; setBusy(true); setMessage("");
    const epoch = lockEpoch.current;
    try {
      const navigate = pathname === "/unlock";
      const optionsJSON = await request({ action: "options", enable, navigate });
      const response = await startAuthentication({ optionsJSON });
      await request({ action: "verify", response });
      if (epoch !== lockEpoch.current) { lock(); throw new Error("The app was closed during verification. Unlock again."); }
      readyOnce.current = true;
      update({ enabled: true, locked: false, supported: true, hasPasskeys: true });
      lastHeartbeat.current = Date.now();
      if (document.hidden) { lock(); return; }
      if (navigate) { navigatingAfterUnlock.current = true; location.replace(safeAppReturn(new URLSearchParams(location.search).get("next"))); return; }
      document.documentElement.dataset.erpAppLocked = "false";
      if (enable) channel.current?.postMessage("changed");
    } catch (error) {
      setMessage(error instanceof Error && error.name === "NotAllowedError" ? enable ? "Verification cancelled. App lock was not enabled; try again." : "Verification cancelled or timed out. ERP stays locked; try again." : error instanceof Error ? error.message : "Could not verify this device.");
    } finally { verifying.current = false; setBusy(false); }
  }
  async function disable(password: string) {
    setBusy(true); setMessage("");
    try {
      await request({ action: "disable", password });
      update({ enabled: false, locked: false, supported: true, hasPasskeys: true });
      document.documentElement.dataset.erpAppLocked = "false";
      channel.current?.postMessage("changed");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not disable app lock."); }
    finally { setBusy(false); }
  }
  const checking = !publicPage && status !== "unauthenticated" && !state;
  const locked = !publicPage && Boolean(state?.enabled && state.locked);
  const showScreen = checking || locked || (!publicPage && pathname === "/unlock");
  const value: LockContext = { state, busy, message, enable: () => verify(true), disable, lock };
  return <Context.Provider value={value}>
    <style>{`html[data-erp-app-locked="true"] [data-erp-private]{visibility:hidden!important;pointer-events:none!important}html[data-erp-app-locked="true"] :is([role="dialog"],[role="alertdialog"]):not([data-erp-lock-screen]),html[data-erp-app-locked="true"] :is([data-radix-popper-content-wrapper],[data-sonner-toaster]){visibility:hidden!important;pointer-events:none!important}${state?.enabled || checking ? "@view-transition{navigation:none}" : ""}`}</style>
    {(publicPage || readyOnce.current) && <div data-erp-private={publicPage ? undefined : "true"} hidden={showScreen} inert={showScreen}>{children}</div>}
    {checking && <div className="fixed inset-0 z-[9999] grid place-items-center bg-background text-sm" role="status">Checking app security…</div>}
    <Dialog open={showScreen}>
    <DialogContent data-erp-lock-screen showCloseButton={false} className="fixed inset-0 z-[10000] flex h-dvh w-screen max-w-none max-h-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-0 bg-background p-6 sm:max-w-none" onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}>
    <main className="flex w-full items-center justify-center" aria-label="ERP app lock">
      <section className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole size={32} /></div>
        <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">KhyatiGems ERP</p><DialogTitle className="text-2xl font-semibold">{checking ? "Checking app security…" : "ERP is locked"}</DialogTitle><DialogDescription className="text-sm text-muted-foreground">{checking ? "Your workspace will appear after the security check." : "Verify with your fingerprint, face, or device PIN to return to your workspace."}</DialogDescription></div>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        {!checking && <Button className="min-h-12 w-full" disabled={busy} onClick={() => verify()}>{busy ? <Loader2 className="animate-spin" /> : <Fingerprint />} {busy ? "Verifying…" : "Unlock ERP"}</Button>}
        {checking && message && <Button variant="outline" onClick={() => location.reload()}>Retry security check</Button>}
        <Button variant="ghost" className="w-full" disabled={busy} onClick={() => signOut({ callbackUrl: "/login" })}>Sign out and use normal login</Button>
        <p className="text-xs text-muted-foreground">Your fingerprint stays on your device. An internet connection is required.</p>
      </section>
    </main>
    </DialogContent>
    </Dialog>
  </Context.Provider>;
}
