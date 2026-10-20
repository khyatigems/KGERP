"use client";

import type { ReactNode } from "react";
import { toast as sonnerToast, type ExternalToast } from "sonner";
import { routeNotification, type NotificationEventKind, type NotificationRoute } from "@/lib/notification-routing";

export { Toaster } from "sonner";

const PRIVATE_OR_INTERNAL_ERROR = /\b(?:prisma|sqlite|sql|constraint|stack trace|ECONN\w*|P\d{4})\b|\b(?:internal server error|database error)\b|Error:\s|\s+at\s+[\w.$]+\s*\(/i;

export function safeErrorMessage(message: ReactNode): ReactNode {
  if (typeof message !== "string") return message;
  return sanitizeErrorText(message);
}

export function sanitizeErrorText(message: string): string {
  return PRIVATE_OR_INTERNAL_ERROR.test(message)
    ? "The action could not be completed. Please try again."
    : message;
}

const safeToastError = (message: ReactNode, options?: ExternalToast) =>
  sonnerToast.error(safeErrorMessage(message), options);

/** The single UI entry point for transient ERP feedback; sanitize thrown/internal error text. */
export const toast = Object.assign(
  (message: ReactNode, options?: ExternalToast) => sonnerToast(message, options),
  sonnerToast,
  { error: safeToastError },
) as typeof sonnerToast;

/** Routes an event to transient UI feedback or returns the channel a page must render itself. */
export function notify(kind: NotificationEventKind, message: string, options?: ExternalToast): NotificationRoute {
  const route = routeNotification(kind);
  if (route !== "toast") return route;
  if (kind === "routine_success") sonnerToast.success(message, { duration: 4_500, ...options });
  else safeToastError(message, { duration: 5_000, ...options });
  return route;
}

export function notifyAction(
  message: string,
  label: string,
  onClick: () => void,
  options?: ExternalToast,
) {
  return notify("routine_success", message, { duration: 5_000, ...options, action: { label, onClick } });
}

/** Keep UI errors useful without ever showing raw server exception text. */
export function notifyFailure(message: string, options?: ExternalToast) {
  return notify("recoverable_error", message, { duration: 5_000, ...options });
}
