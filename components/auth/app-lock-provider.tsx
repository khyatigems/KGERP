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
import { APP_LOCK_GRACE_MS } from "@/lib/security/app-lock-timing";
import { localUnlockDevice } from "@/lib/security/app-unlock-device";

type LockStatus = { enabled: boolean; locked: boolean; supported: boolean; hasPasskeys: boolean };
type LockContext = { state: LockStatus | null; busy: boolean; message: string; enable: () => Promise<void>; disable: (password: string) => Promise<void>; lock: () => void };
const Context = createContext<LockContext | null>(null);
export function useAppLock() { return useContext(Context); }

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, data: session } = useSession();
  const publicPage = isPublicPage(pathname);
  const [state, setState] = useState<LockStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [message, setMessage] = useState("");
  const stateRef = useRef<LockStatus | null>(null);
  const verifying = useRef(false);
  const nativeFetch = useRef<typeof fetch | null>(null);
  const lastHeartbeat = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const readyOnce = useRef(false);
  const lockEpoch = useRef(0);
  const navigatingAfterUnlock = useRef(false);
  const awaySince = useRef(0);
  const awayTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const update = useCallback((next: LockStatus) => {
    if (!next.enabled) { awaySince.current = 0; clearTimeout(awayTimer.current); }
    stateRef.current = next; setState(next);
  }, []);
  const request = useCallback(async (body?: unknown) => {
    const response = await (nativeFetch.current || fetch)("/api/auth/app-lock", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" } : { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to check app lock.");
    return data;
  }, []);
  const lock = useCallback(() => {
    if (!stateRef.current?.enabled) return;
    lockEpoch.current += 1;
    awaySince.current = 0;
    clearTimeout(awayTimer.current);
    setResuming(false);
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
      if (privateRequest && stateRef.current?.enabled && (response.status === 423 || response.status === 503)) {
        const problem = await response.clone().json().catch(() => null);
        if (problem?.code === "APP_LOCKED" || problem?.code === "APP_LOCK_UNAVAILABLE") lock();
      }
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
      document.documentElement.dataset.erpAppLocked = data.enabled && (data.locked || awaySince.current > 0) ? "true" : "false";
      if (data.enabled && !data.locked && !document.hidden) channel.current?.postMessage("active");
      if (pathname === "/unlock" && !data.enabled) location.replace(safeAppReturn(new URLSearchParams(location.search).get("next")));
    }).catch(error => { if (active) { setMessage(error.message); if (stateRef.current?.enabled) lock(); } });
    return () => { active = false; };
  }, [status, publicPage, pathname, request, update, lock]);

  useEffect(() => {
    function expireAway() {
      if (!awaySince.current) return;
      const remaining = APP_LOCK_GRACE_MS - (Date.now() - awaySince.current);
      if (remaining <= 0) lock();
      else awayTimer.current = setTimeout(expireAway, remaining);
    }
    function beginAway() {
      if (!stateRef.current?.enabled || stateRef.current.locked || verifying.current || navigatingAfterUnlock.current || awaySince.current) return;
      awaySince.current = Date.now();
      document.documentElement.dataset.erpAppLocked = "true";
      // Cover immediately for privacy, but do not revoke the grant until the
      // one-minute grace expires. A short Alt+Tab can resume without biometrics.
      void (nativeFetch.current || fetch)("/api/auth/app-lock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "suspend" }), keepalive: true }).catch(() => {});
      awayTimer.current = setTimeout(expireAway, APP_LOCK_GRACE_MS);
    }
    async function resumeAway() {
      if (document.hidden || verifying.current || !stateRef.current?.enabled || stateRef.current.locked) return;
      const elapsed = awaySince.current ? Date.now() - awaySince.current : 0;
      if (elapsed >= APP_LOCK_GRACE_MS) { lock(); return; }
      if (!awaySince.current && Date.now() - lastHeartbeat.current < 45000) return;
      const epoch = lockEpoch.current;
      setResuming(true);
      clearTimeout(awayTimer.current);
      try {
        await request({ action: "heartbeat" });
        if (epoch !== lockEpoch.current || document.hidden) return;
        if (awaySince.current && Date.now() - awaySince.current >= APP_LOCK_GRACE_MS) { lock(); return; }
        awaySince.current = 0;
        lastHeartbeat.current = Date.now();
        channel.current?.postMessage("active");
        document.documentElement.dataset.erpAppLocked = "false";
      } catch { lock(); }
      finally { setResuming(false); }
    }
    function visibility() { if (document.hidden) beginAway(); else void resumeAway(); }
    function pagehide() { if (verifying.current && stateRef.current?.enabled) lock(); else beginAway(); }
    function pageshow(event: PageTransitionEvent) { if (event.persisted || awaySince.current) void resumeAway(); }
    function focus() { void resumeAway(); }
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    window.addEventListener("focus", focus);
    document.addEventListener("resume", focus);
    try {
      channel.current = new BroadcastChannel(`erp-app-lock:${session?.user?.appSessionId || session?.user?.id || "current"}`);
      channel.current.onmessage = event => {
        if (event.data === "locked") lock();
        if (event.data === "active" && document.hidden && awaySince.current && !stateRef.current?.locked) {
          // Activity in another ERP tab keeps this shared browser session alive.
          awaySince.current = Date.now();
          clearTimeout(awayTimer.current);
          awayTimer.current = setTimeout(expireAway, APP_LOCK_GRACE_MS);
        }
        if (event.data === "changed") {
          const epoch = lockEpoch.current;
          void request().then((data: LockStatus) => { if (epoch === lockEpoch.current) { update(data); if (data.enabled && data.locked) lock(); else if (data.enabled && document.hidden) beginAway(); } }).catch(() => lock());
        }
      };
    } catch { /* Server enforcement also applies when channels are unavailable. */ }
    const timer = setInterval(() => {
      if (!stateRef.current?.enabled || stateRef.current.locked || document.hidden || awaySince.current > 0 || verifying.current || navigatingAfterUnlock.current) return;
      void request({ action: "heartbeat" }).then(() => { lastHeartbeat.current = Date.now(); channel.current?.postMessage("active"); }).catch(() => lock());
    }, 20000);
    return () => {
      document.removeEventListener("visibilitychange", visibility); document.removeEventListener("resume", focus);
      window.removeEventListener("pagehide", pagehide); window.removeEventListener("pageshow", pageshow); window.removeEventListener("focus", focus);
      clearTimeout(awayTimer.current);
      clearInterval(timer); channel.current?.close(); channel.current = null;
    };
  }, [lock, request, update, session?.user?.appSessionId, session?.user?.id]);

  async function verify(enable = false) {
    if (verifying.current) return;
    verifying.current = true; setBusy(true); setMessage("");
    const epoch = lockEpoch.current;
    try {
      const navigate = pathname === "/unlock";
      const optionsJSON = await request({ action: "options", enable, navigate, credentialId: localUnlockDevice(session?.user?.id) });
      const response = await startAuthentication({ optionsJSON });
      await request({ action: "verify", response });
      if (epoch !== lockEpoch.current) { lock(); throw new Error("The app was closed during verification. Unlock again."); }
      readyOnce.current = true;
      awaySince.current = 0;
      clearTimeout(awayTimer.current);
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
  const checking = !publicPage && (resuming || (status !== "unauthenticated" && !state));
  const locked = !publicPage && Boolean(state?.enabled && state.locked);
  const showScreen = checking || locked || (!publicPage && pathname === "/unlock");
  const value: LockContext = { state, busy, message, enable: () => verify(true), disable, lock };
  return <Context.Provider value={value}>
    <style>{`html[data-erp-app-locked="true"] [data-erp-private]{visibility:hidden!important;pointer-events:none!important}html[data-erp-app-locked="true"] :is([role="dialog"],[role="alertdialog"]):not([data-erp-lock-screen]),html[data-erp-app-locked="true"] :is([data-radix-popper-content-wrapper],[data-sonner-toaster]){visibility:hidden!important;pointer-events:none!important}${state?.enabled || checking ? "@view-transition{navigation:none}" : ""}`}</style>
    {(publicPage || readyOnce.current) && <div data-erp-private={publicPage ? undefined : "true"} hidden={showScreen} inert={showScreen}>{children}</div>}
    {checking && <div className="fixed inset-0 z-[9999] grid place-items-center bg-background text-sm" role="status">Checking app security…</div>}
    <Dialog open={showScreen}>
    <DialogContent data-erp-lock-screen showCloseButton={false} className="data-[state=closed]:hidden fixed inset-0 z-[10000] flex h-dvh w-screen max-w-none max-h-none translate-x-0 translate-y-0 items-center justify-center rounded-none border-0 bg-background p-6 sm:max-w-none" onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()}>
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
