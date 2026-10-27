"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Download, KeyRound, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRecoveryExport } from "@/lib/security/recovery-export";

type Props = {
  enabled: boolean;
  zohoConfigured: boolean;
  accountEmail: string;
  codes: string[];
  remaining: number;
  requiresSignIn: boolean;
  onGenerated: (codes: string[]) => void;
};
export function RecoveryCodesPanel({ enabled, zohoConfigured, accountEmail, codes, remaining, requiresSignIn, onGenerated }: Props) {
  const panel = useRef<HTMLElement>(null);
  const [replacing, setReplacing] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (codes.length) {
      panel.current?.focus({ preventScroll: true });
      panel.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [codes]);
  const exportText = () => formatRecoveryExport(codes, accountEmail);
  async function copyCodes() {
    setError("");
    try { await navigator.clipboard.writeText(exportText()); setMessage("Recovery codes copied. Save them in your password manager or another secure place."); }
    catch { setError("Clipboard access is unavailable. Use Download codes or select and copy the codes below."); }
  }
  function downloadCodes() {
    setError("");
    const url = URL.createObjectURL(new Blob([exportText()], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "khyatigems-erp-recovery-codes.txt";
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Recovery codes downloaded. Keep the file in a secure place outside ERP.");
  }
  async function submit(action: "request-code" | "generate") {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/settings/security/recovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, password, code }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not generate recovery codes.");
      if (action === "request-code") { setSent(true); setCode(""); setMessage("Verification code sent to your configured OTP mailbox. It expires in 5 minutes."); }
      else { onGenerated(data.recoveryCodes); setPassword(""); setCode(""); setSent(false); setReplacing(false); setMessage("New recovery codes are ready. Download or copy them now; they are shown only once."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }
  return <section ref={panel} tabIndex={-1} aria-labelledby="recovery-title" className="scroll-mt-6 outline-none">
    <Card className={codes.length ? "border-primary/40 bg-primary/[0.02]" : ""}>
      <CardHeader><div className="flex items-start gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="space-y-2"><CardTitle id="recovery-title">{codes.length ? "Save your recovery codes now" : "Recovery codes"}</CardTitle><CardDescription>{codes.length ? "Shown once. Download the file or copy all codes before leaving this page." : enabled ? `${remaining} unused recovery codes for your account. If you missed saving the original set, generate replacements below.` : "Recovery codes are generated when you enable and verify 2FA. Download and copy options will appear here."}</CardDescription></div></div></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">These codes work only for your account, together with its password. Each code works once. Keep them securely outside ERP; existing codes cannot be displayed again.</p>
        {codes.length > 0 && <>
          <div className="flex flex-wrap gap-3"><Button id="download-recovery-codes" type="button" onClick={downloadCodes}><Download className="h-4 w-4" />Download codes (.txt)</Button><Button id="copy-recovery-codes" type="button" variant="outline" onClick={() => void copyCodes()}><Copy className="h-4 w-4" />Copy all codes</Button></div>
          <div className="grid gap-2 sm:grid-cols-2">{codes.map((value, index) => <div key={value} className="flex min-w-0 items-start gap-3 rounded-lg border bg-background px-3 py-2.5"><span className="pt-0.5 text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span><code className="min-w-0 break-all text-sm select-all">{value}</code></div>)}</div>
          {requiresSignIn && <p className="text-sm">Mandatory 2FA settings changed. Save your codes, then <Link href="/login" className="font-medium underline">sign in again</Link>.</p>}
        </>}
        {codes.length === 0 && <Button id="regenerate-recovery-codes" type="button" variant="outline" disabled={!enabled || !zohoConfigured || busy} onClick={() => { setReplacing(true); setMessage(""); setError(""); }}><RefreshCw className="h-4 w-4" />{remaining ? "Generate replacement codes" : "Generate recovery codes"}</Button>}
        {replacing && <form className="space-y-4 rounded-lg border bg-muted/20 p-4" onSubmit={e => { e.preventDefault(); void submit(sent ? "generate" : "request-code"); }}>
          <p className="text-sm">Replacing codes invalidates your previous set. Confirm your password and the email code to continue. Other users&apos; recovery codes and active sessions stay unchanged.</p>
          <fieldset disabled={busy} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="recovery-password">Your current ERP password</Label><Input id="recovery-password" type="password" required maxLength={1024} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></div>
            {sent && <div className="space-y-2"><Label htmlFor="recovery-code">Email verification code</Label><Input id="recovery-code" inputMode="numeric" required pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} /></div>}
            <div className="flex flex-wrap gap-3"><Button id="recovery-submit" type="submit">{busy ? "Please wait…" : sent ? "Verify and generate codes" : "Send verification code"}</Button><Button type="button" variant="ghost" onClick={() => { setReplacing(false); setPassword(""); setCode(""); setSent(false); }}>Cancel</Button></div>
          </fieldset>
        </form>}
        {message && <p role="status" className="text-sm">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  </section>;
}
