"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

function AuthenticatorQr({ src, enlarged = false }: { src: string; enlarged?: boolean }) {
  // Keep the opaque white quiet zone in dark mode and preserve the square aspect ratio.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={512} height={512} alt="Scan with your authenticator app to add your KhyatiGems ERP account" className={`mx-auto block h-auto w-full bg-white ${enlarged ? "max-w-96" : "max-w-72"}`} style={{ aspectRatio: "1 / 1", imageRendering: "pixelated", colorScheme: "light" }} />;
}

type Setup = { secret: string; qr: string; version: string; emailRequired: boolean };
export function AuthenticatorForm({ enabled, recoveryRemaining, accountEmail, emailEnabled, configured }: {
  enabled: boolean; recoveryRemaining: number; accountEmail: string; emailEnabled: boolean; configured: boolean;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const exportText = `KhyatiGems ERP authenticator recovery codes\nAccount: ${accountEmail}\nEach code works once. Keep these private.\n\n${codes.map((value, i) => `${i + 1}. ${value}`).join("\n")}`;
  async function submit(action: "begin" | "activate" | "remove") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/security/authenticator", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, password, code, emailCode, version: setup?.version }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update authenticator.");
      if (action === "begin") { setSetup(data); setCode(""); setEmailCode(""); }
      else { setSaved(true); setSetup(null); setPassword(""); setCode(""); setEmailCode(""); setCodes(data.recoveryCodes || []); setMessage(data.message); }
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Your authenticator app</CardTitle><CardDescription>Personal to {accountEmail}. Each ERP user sets up their own app. Current status: {enabled ? "Enabled" : "Not enabled"}.</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      <p className="text-sm text-muted-foreground">Use Google Authenticator, Microsoft Authenticator, or another compatible app. After setup, sign in with your password and the current app code without waiting for an email OTP. {emailEnabled ? "Company email OTP remains available as a fallback." : "Keep the recovery codes safe in case you lose your phone."}</p>
      {!configured && <p role="alert" className="rounded-lg border p-3 text-sm">Ask your administrator to configure secret encryption before setting up an authenticator.</p>}
      {enabled && !saved && <p className="text-sm">{recoveryRemaining} authenticator recovery codes remaining. Removing and setting up your app again issues a fresh set.</p>}
      {!saved && <form className="space-y-5" onSubmit={event => { event.preventDefault(); void submit(enabled ? "remove" : setup ? "activate" : "begin"); }}>
        <fieldset disabled={busy || !configured} className="space-y-5 disabled:opacity-70">
          <div className="space-y-2"><Label htmlFor="authenticator-password">Your current ERP password</Label><Input id="authenticator-password" type="password" required maxLength={1024} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></div>
          {setup && <div className="space-y-4 rounded-lg border p-4">
            <p className="text-sm font-medium">1. Add this account to your authenticator app</p>
            <p className="text-sm text-muted-foreground">In Microsoft Authenticator, tap <strong>+</strong>, choose <strong>Other account (Google, Facebook, etc.)</strong>, then scan this QR code.</p>
            {/* QR is generated locally on the server; the secret is never sent to an external QR service. */}
            <AuthenticatorQr src={setup.qr} />
            <Dialog><DialogTrigger asChild><Button type="button" variant="outline">Enlarge QR code</Button></DialogTrigger><DialogContent className="p-4 sm:max-w-lg"><DialogTitle className="pr-8">Scan your authenticator QR</DialogTitle><DialogDescription>In Microsoft Authenticator, choose Other account. Account: {accountEmail}</DialogDescription><AuthenticatorQr src={setup.qr} enlarged /></DialogContent></Dialog>
            <p className="text-sm text-muted-foreground">Cannot scan, or viewing this page on the same phone? In Other account, choose <strong>Enter code manually</strong>. Use KhyatiGems ERP ({accountEmail}) as the account name and the setup key below. Keep the QR and key private.</p>
            <code className="block select-all break-all rounded-md bg-muted p-3 text-sm">{setup.secret}</code>
            <p className="text-xs text-muted-foreground">Account: {accountEmail}. Time-based code, 6 digits, refreshes every 30 seconds. Setup expires in 10 minutes.</p>
            {setup.emailRequired && <div className="space-y-2"><Label htmlFor="authenticator-email-code">2. Confirm the code sent to the company OTP mailbox</Label><Input id="authenticator-email-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={emailCode} onChange={event => setEmailCode(event.target.value.replace(/\D/g, ""))} /><p className="text-xs text-muted-foreground">The email code expires in 5 minutes.</p></div>}
          </div>}
          {(enabled || setup) && <div className="space-y-2"><Label htmlFor="authenticator-code">{enabled ? "Current authenticator code or authenticator recovery code" : "Enter the current six-digit code from your app"}</Label><Input id="authenticator-code" required autoComplete="one-time-code" inputMode={enabled ? "text" : "numeric"} maxLength={enabled ? 24 : 6} pattern={enabled ? "([0-9]{6}|[a-fA-F0-9]{24})" : "[0-9]{6}"} value={code} onChange={event => setCode(event.target.value.trim())} /><p className="text-xs text-muted-foreground">Use a fresh code that you have not already submitted. Enable automatic date and time on your phone.</p></div>}
          {enabled && <p className="text-sm text-muted-foreground">Removing the app affects only your account. Company email verification continues if enabled.</p>}
          <div className="flex flex-wrap gap-3"><Button type="submit" variant={enabled ? "outline" : "default"}>{busy ? "Please wait..." : enabled ? "Verify and remove authenticator" : setup ? "Verify and enable authenticator" : "Set up authenticator"}</Button>{setup && <Button type="button" variant="outline" onClick={() => void submit("begin")}>Restart setup</Button>}</div>
        </fieldset>
      </form>}
      {codes.length > 0 && <div className="space-y-4 rounded-lg border p-4"><h3 className="font-medium">Save your personal recovery codes</h3><p className="text-sm text-muted-foreground">These are shown only once. Each code can replace your authenticator code once at sign-in. Store them somewhere private outside this ERP.</p><div className="grid gap-2 sm:grid-cols-2">{codes.map(value => <code key={value} className="select-all break-all rounded bg-muted p-2 text-xs">{value}</code>)}</div><div className="flex flex-wrap gap-3"><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(exportText); setMessage("Recovery codes copied. Store them securely, then sign in again."); } catch { setError("Copy was unavailable. Download the codes instead."); } }}>Copy recovery codes</Button><Button variant="outline" onClick={() => { const url = URL.createObjectURL(new Blob([exportText], { type: "text/plain" })); const link = document.createElement("a"); link.href = url; link.download = "khyatigems-authenticator-recovery-codes.txt"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Download recovery codes</Button></div></div>}
      {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}
      {saved && <Button onClick={() => void signOut({ callbackUrl: "/login" })}>Sign in again</Button>}
    </CardContent>
  </Card>;
}
