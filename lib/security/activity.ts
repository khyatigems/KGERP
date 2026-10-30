export const securityActions: Record<string, { label: string; description: string }> = {
  LOGIN: { label: "Signed in", description: "User signed in successfully." },
  LOGIN_PASSWORD_FAILED: { label: "Incorrect password", description: "A sign-in attempt was rejected because the password was incorrect." },
  LOGIN_OTP_REQUESTED: { label: "Email code requested", description: "An email verification code was requested to complete sign-in." },
  LOGIN_OTP_FAILED: { label: "Verification failed", description: "Sign-in verification failed. No session was granted for this attempt." },
  LOGIN_OTP_VERIFIED: { label: "Email code verified", description: "The account passed email verification for sign-in." },
  LOGIN_AUTHENTICATOR_VERIFIED: { label: "Authenticator verified", description: "The account passed authenticator app verification for sign-in." },
  LOGIN_RECOVERY_USED: { label: "Recovery code used", description: "A single-use recovery code was accepted for sign-in." },
  SECURITY_CHANGE_REQUESTED: { label: "Security verification requested", description: "A verification code was requested for a security change. This does not mean the change was saved." },
  AUTHENTICATOR_SETUP_REQUESTED: { label: "Authenticator setup requested", description: "Email confirmation was requested to add a personal authenticator. The app is not enabled until setup is verified." },
  RECOVERY_CODES_REQUESTED: { label: "Recovery code replacement requested", description: "Email confirmation was requested to generate new recovery codes. The existing codes have not yet been replaced." },
  SECURITY_POLICY_CHANGED: { label: "Email security settings changed", description: "The company email verification settings were verified and saved." },
  AUTHENTICATOR_ENABLED: { label: "Authenticator enabled", description: "A personal authenticator app was verified and enabled for this account." },
  AUTHENTICATOR_DISABLED: { label: "Authenticator removed", description: "The personal authenticator app was removed from this account." },
  RECOVERY_CODES_REPLACED: { label: "Recovery codes replaced", description: "New recovery codes were generated. The previous set no longer works." },
};

type Activity = {
  module?: string | null; entityType?: string | null; action?: string | null; actionType?: string | null;
  referenceId?: string | null; entityIdentifier?: string | null; entityId?: string | null;
  userName?: string | null; userEmail?: string | null; userId?: string | null;
  description?: string | null; details?: string | null;
};
export function presentActivity(log: Activity, account?: { name: string; email: string }) {
  const security = (log.module || log.entityType) === "Security";
  const action = log.action || log.actionType || "UNKNOWN";
  const copy = security ? securityActions[action] : undefined;
  const storedDescription = log.description || log.details;
  const reference = log.referenceId || log.entityIdentifier || log.entityId;
  const meaningfulReference = reference && reference !== log.entityId && reference !== log.userId;
  return {
    security, action, label: copy?.label || action,
    reference: security ? (meaningfulReference ? reference : log.userEmail || account?.email || "Account no longer available") : reference || "-",
    user: security && (!log.userName || ["Sign-in security", "Unknown"].includes(log.userName))
      ? account?.name || log.userEmail || account?.email || "Unavailable account"
      : (log.userName && log.userName !== "Unknown" ? log.userName : log.userId) || "System",
    description: copy && (!storedDescription || storedDescription === action || storedDescription === action.replaceAll("_", " "))
      ? copy.description : storedDescription || copy?.description || "-",
  };
}

export function securityRequestDetails(metadata: string | null | undefined): string[] {
  if (!metadata) return [];
  try {
    const value = JSON.parse(metadata);
    if (typeof value.context === "string") return value.context.split("\n").filter(Boolean);
    return [];
  } catch { return []; }
}
