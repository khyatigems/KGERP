"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecurityPolicy } from "@/lib/security/core";
import { RecoveryCodesPanel } from "@/components/settings/recovery-codes-panel";

export function SecurityForm({ initial, zohoConfigured, recoveryRemaining = 0, accountEmail = "" }: { initial: SecurityPolicy; zohoConfigured: boolean; recoveryRemaining?: number; accountEmail?: string }) {
  const [email, setEmail] = useState(initial.email);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [alerts, setAlerts] = useState(initial.alerts);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [currentCode, setCurrentCode] = useState("");
  const [sent, setSent] = useState(false);
  const [needsCurrentCode, setNeedsCurrentCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const resetVerification = () => { setSent(false); setCode(""); setCurrentCode(""); setMessage(""); };
  async function submit(action: "request-code" | "save") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/security", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, email, enabled, alerts, password, code, currentCode }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save security settings.");
      if (action === "request-code") {
        setSent(true); setNeedsCurrentCode(data.needsCurrentCode); setCode(""); setCurrentCode("");
        setMessage(data.needsCurrentCode ? "Codes sent to the new mailbox and the current OTP mailbox. Enter both below." : "Code sent through Zoho. Enter it below to confirm and save. It expires in 5 minutes.");
      } else {
        setSaved(true); setSent(false); setPassword(""); setCode(""); setCurrentCode("");
        setMessage(data.message); setRecoveryCodes(data.recoveryCodes || []);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <RecoveryCodesPanel enabled={saved ? enabled : initial.enabled} zohoConfigured={zohoConfigured} accountEmail={accountEmail} codes={recoveryCodes} remaining={recoveryCodes.length || recoveryRemaining} requiresSignIn={saved && enabled} onGenerated={setRecoveryCodes} />
    <Card><CardHeader><CardTitle>Email verification</CardTitle><CardDescription>Current status: {(saved ? enabled : initial.enabled) ? "Enabled" : "Disabled"}. Settings take effect after verification and saving.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">Zoho OAuth configuration: {zohoConfigured ? "Available. Sending a verification code checks delivery." : "Missing."} <Link href="/settings/email-templates" className="underline">Manage Zoho connection</Link></p>
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); void submit(sent ? "save" : "request-code"); }}>
          <fieldset disabled={busy || saved} className="space-y-5 disabled:opacity-70">
            <label className="flex items-start gap-3"><input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); resetVerification(); }} className="mt-1 h-4 w-4" /><span><span className="font-medium">Require 2FA for all ERP web users</span><span className="block text-sm text-muted-foreground">Users need their password and a code sent to the default mailbox.</span></span></label>
            <div className="space-y-2"><Label htmlFor="otp-email">Default OTP email address</Label><Input id="otp-email" type="email" required maxLength={254} value={email} onChange={e => { setEmail(e.target.value); resetVerification(); }} placeholder="security@yourcompany.com" autoComplete="off" /><p className="text-xs text-muted-foreground">Everyone with access to this shared mailbox can approve ERP sign-ins. Protect the mailbox with its own MFA.</p></div>
            <label className="flex items-start gap-3"><input type="checkbox" checked={alerts} onChange={e => { setAlerts(e.target.checked); resetVerification(); }} className="mt-1 h-4 w-4" /><span>Send completed-login alerts to this mailbox</span></label>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm">Codes expire after 5 minutes and allow 5 guesses. Resend is limited to once per minute. Emails include the account, browser, OS, IP and approximate location when available. Browser information is reported by the device and location can reflect a VPN.</div>
            <div className="space-y-2"><Label htmlFor="security-password">Your current ERP password</Label><Input id="security-password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
            {sent && <div className="space-y-4"><div className="space-y-2"><Label htmlFor="security-code">Code sent to {email}</Label><Input id="security-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /></div>
              {needsCurrentCode && <div className="space-y-2"><Label htmlFor="current-security-code">Code sent to current mailbox ({initial.email})</Label><Input id="current-security-code" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={currentCode} onChange={e => setCurrentCode(e.target.value.replace(/\D/g, ""))} /></div>}</div>}
            <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!zohoConfigured}>{busy ? "Please wait…" : sent ? "Verify and save security settings" : "Send verification code"}</Button>{sent && <Button type="button" variant="outline" onClick={() => void submit("request-code")}>Resend code</Button>}</div>
          </fieldset>
        </form>
        {message && <p role="status" className="rounded-lg border p-3 text-sm">{message}</p>}
        {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
    <Card><CardHeader><CardTitle>Security activity</CardTitle><CardDescription>OTP requests, verification failures, recovery use and setting changes are recorded in the activity log. Passwords and codes are excluded.</CardDescription></CardHeader><CardContent><Link href="/activity-log" className="text-sm underline">Open activity log</Link></CardContent></Card>
  </div>;
}
