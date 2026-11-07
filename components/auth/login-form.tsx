"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [method, setMethod] = useState<"email" | "authenticator">("email");
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [authenticatorAvailable, setAuthenticatorAvailable] = useState(false);
  const [otp, setOtp] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  async function requestCode(email: string, password: string, requestedMethod?: "email") {
    const response = await fetch("/api/auth/otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, method: requestedMethod }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not send verification code.");
    if (data.required) {
      setOtpRequired(true); setRecipient(data.recipient || ""); setOtp("");
      setMethod(data.method === "authenticator" ? "authenticator" : "email");
      setEmailAvailable(Boolean(data.emailAvailable || data.method === "email"));
      setAuthenticatorAvailable(Boolean(data.authenticatorAvailable || data.method === "authenticator"));
    }
    return Boolean(data.required);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      if (!otpRequired && !useRecovery && await requestCode(email, password)) return;
      const res = await signIn("credentials", {
        email,
        password,
        otp: useRecovery || method === "authenticator" ? "" : otp,
        authenticatorCode: !useRecovery && method === "authenticator" ? otp : "",
        recoveryCode: useRecovery ? recoveryCode : "",
        redirect: false,
      });

      if (res?.error) {
        setError(otpRequired || useRecovery ? "Sign-in failed. Check your password and use a fresh verification code. Authenticator codes change every 30 seconds; recovery codes work once." : "Invalid email or password");
        setLoading(false);
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full space-y-5">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Email address
          </label>
          <Input
            id="email"
            type="email"
            name="email"
            readOnly={otpRequired}
            autoComplete="email"
            required
            placeholder="name@khyatigems.com"
            className="h-12 w-full rounded-lg border border-input bg-background text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:ring-ring"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              readOnly={otpRequired}
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              className="h-12 w-full rounded-lg border border-input bg-background pr-12 text-base text-foreground placeholder:text-muted-foreground transition-colors focus-visible:ring-ring"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {(otpRequired || useRecovery) && <div className="space-y-3">
        <p role="status" className="text-sm text-foreground">{useRecovery ? "Enter a saved recovery code for your account." : method === "authenticator" ? "Open your authenticator app and enter the current KhyatiGems ERP code for this account. No email code was sent." : `A verification code was sent to ${recipient}. It expires in 5 minutes.`}</p>
        <label htmlFor="login-verification" className="block text-sm text-foreground">{useRecovery ? "Recovery code" : method === "authenticator" ? "Authenticator code" : "Email verification code"}</label>
        <Input id="login-verification" required autoComplete={useRecovery ? "off" : "one-time-code"} inputMode={useRecovery ? "text" : "numeric"} maxLength={useRecovery ? 24 : 6} pattern={useRecovery ? "[a-fA-F0-9]{24}" : "[0-9]{6}"} value={useRecovery ? recoveryCode : otp} onChange={e => useRecovery ? setRecoveryCode(e.target.value.trim()) : setOtp(e.target.value.replace(/\D/g, ""))} className="h-12 border-input bg-background text-foreground" />
        {!useRecovery && emailAvailable && <button type="button" disabled={loading} className="text-sm text-primary underline disabled:opacity-50" onClick={async e => {
          const form = e.currentTarget.form;
          if (!form) return;
          const data = new FormData(form); setLoading(true); setError("");
          try { await requestCode(String(data.get("email")), String(data.get("password")), "email"); }
          catch (error) { setError(error instanceof Error ? error.message : "Could not resend code."); }
          finally { setLoading(false); }
        }}>{method === "authenticator" ? "Send an email code instead" : "Resend email code (wait 60 seconds)"}</button>}
        {!useRecovery && method === "email" && authenticatorAvailable && <button type="button" disabled={loading} className="block text-sm text-primary underline" onClick={() => { setMethod("authenticator"); setOtp(""); setError(""); }}>Use authenticator app instead</button>}
        <button type="button" disabled={loading} className="block text-sm text-muted-foreground underline" onClick={() => { setOtpRequired(false); setUseRecovery(false); setOtp(""); setRecoveryCode(""); setError(""); }}>Back to password</button>
      </div>}

      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 select-none text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="rememberMe"
            className="h-4 w-4 rounded border-input bg-background accent-primary"
          />
          Remember me
        </label>

        <button
          type="button"
          disabled={loading}
          onClick={() => { setUseRecovery(!useRecovery); setOtpRequired(false); setOtp(""); setRecoveryCode(""); setError(""); }}
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {useRecovery ? "Use verification code" : "Use a recovery code"}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-base font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </span>
        ) : (
          otpRequired || useRecovery ? "Verify and sign in" : "Sign In"
        )}
      </button>
    </form>
  );
}
