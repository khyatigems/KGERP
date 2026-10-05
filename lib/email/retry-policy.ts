export const MAX_EMAIL_ATTEMPTS = 5;
export const TRANSIENT_EMAIL_FAILURE_CODES = [
  "NETWORK_ERROR",
  "PROVIDER_TEMPORARY",
  "RATE_LIMITED",
  "TIMEOUT",
] as const;

export const EMAIL_RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000] as const;

export function classifyEmailFailure(error: string): string {
  const message = error.toLowerCase();
  if (
    /invalid.*(email|recipient|address)|no recipient|missing recipient|missing attachment|missing email body|attachment.*(missing|not found)/i.test(
      message,
    )
  ) {
    return "INVALID_MESSAGE";
  }
  if (
    /authentication|unauthorized|forbidden|invalid.*(api key|token|credential)|not configured|not connected|expired.*token|401|403/i.test(
      message,
    )
  ) {
    return "PROVIDER_AUTH";
  }
  if (/rate.?limit|too many requests|\b429\b/i.test(message)) return "RATE_LIMITED";
  if (/timeout|timed out|etimedout|\b408\b/i.test(message)) return "TIMEOUT";
  if (/\b425\b/i.test(message)) return "PROVIDER_TEMPORARY";
  if (
    /network|econn|connection reset|connection refused|dns|enotfound|eai_again|ehostunreach|fetch failed|socket|\b5\d\d\b|temporar|unavailable|busy/i.test(
      message,
    )
  ) {
    return "NETWORK_ERROR";
  }
  return "PROVIDER_REJECTION";
}

export function isRetryableEmailFailure(failureCode: string | null | undefined, attemptCount: number): boolean {
  return Boolean(
    failureCode &&
      TRANSIENT_EMAIL_FAILURE_CODES.includes(failureCode as (typeof TRANSIENT_EMAIL_FAILURE_CODES)[number]) &&
      attemptCount < MAX_EMAIL_ATTEMPTS,
  );
}

export function retryDelayMs(completedAttempts: number): number | null {
  return EMAIL_RETRY_DELAYS_MS[completedAttempts - 1] ?? null;
}
