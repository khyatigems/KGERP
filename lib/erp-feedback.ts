"use client";

import { COMPANION_FEEDBACK_EVENT } from "@/lib/companion-events";
import { companionToastOptions } from "@/lib/companion-runtime";
import { createElement, type ReactNode } from "react";
import { RichFeedbackTitle, RichFeedbackDetails, type FeedbackState } from "@/components/ui/rich-feedback";
import { FeedbackIcon } from "@/components/ui/feedback-icon";
import { toast as sonnerToast, type ExternalToast } from "sonner";
import { routeNotification, type NotificationEventKind, type NotificationRoute } from "@/lib/notification-routing";

export { FeedbackToaster as Toaster } from "@/components/companion/feedback-toaster";

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

function richMessage(state: FeedbackState, message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) {
  const title = typeof message === "function" ? message() : message;
  const description = typeof options?.description === "function" ? options.description() : options?.description;
  return {
    title: createElement(RichFeedbackTitle, { state }, state === "error" ? safeErrorMessage(title) : title),
    options: {
      // Loading stays visible until the caller updates or dismisses the operation.
      duration: state === "loading" ? Infinity : options?.action || options?.cancel || state === "error" ? 8_000 : 4_500,
      ...(state === "normal" ? { icon: createElement(FeedbackIcon, { state: "normal" }) } : {}),
      ...options,
      description: description == null ? undefined : createElement(RichFeedbackDetails, null, state === "error" ? safeErrorMessage(description) : description),
    },
  };
}

function showRichToast(state: FeedbackState, message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) {
  if (typeof window !== "undefined" && ["loading", "success", "warning", "error"].includes(state)) {
    window.dispatchEvent(new CustomEvent(COMPANION_FEEDBACK_EVENT, { detail: {
      state: state === "loading" ? "working" : state === "error" ? "warning" : state,
    } }));
  }
  const rich = richMessage(state, message, options);
  const show = state === "normal" ? sonnerToast.message : sonnerToast[state];
  return show(rich.title, companionToastOptions(rich.options));
}

/** The single UI entry point for transient ERP feedback; sanitize thrown/internal error text. */
export const toast = Object.assign(
  (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) => showRichToast("normal", message, options),
  sonnerToast,
  {
    // Custom operation cards provide their own accessible dismissal control.
    custom: (render: Parameters<typeof sonnerToast.custom>[0], options?: ExternalToast) => sonnerToast.custom(render, companionToastOptions({ closeButton: false, ...options })),
    promise: ((promise, options) => sonnerToast.promise(promise, options ? companionToastOptions(options) : options)) as typeof sonnerToast.promise,
    success: (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) => showRichToast("success", message, options),
    error: (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) => showRichToast("error", message, options),
    warning: (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) => showRichToast("warning", message, options),
    info: (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) => showRichToast("info", message, options),
    loading: (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) => showRichToast("loading", message, options),
    message: (message: Parameters<typeof sonnerToast>[0], options?: ExternalToast) => showRichToast("normal", message, options),
  },
) as typeof sonnerToast;

/** Routes an event to transient UI feedback or returns the channel a page must render itself. */
export function notify(kind: NotificationEventKind, message: string, options?: ExternalToast): NotificationRoute {
  const route = routeNotification(kind);
  if (route !== "toast") return route;
  if (kind === "routine_success") toast.success(message, { duration: 4_500, ...options });
  else toast.error(message, { duration: 5_000, ...options });
  return route;
}

export function notifyAction(
  message: string,
  label: string,
  onClick: () => void,
  options?: ExternalToast,
) {
  return notify("routine_success", message, { duration: 8_000, ...options, action: { label, onClick } });
}

/** Keep UI errors useful without ever showing raw server exception text. */
export function notifyFailure(message: string, options?: ExternalToast) {
  return notify("recoverable_error", message, { duration: 5_000, ...options });
}
