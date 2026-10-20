export type NotificationEventKind =
  | "routine_success"
  | "recoverable_error"
  | "contextual_warning"
  | "operational_failure";

export type NotificationRoute = "toast" | "inline" | "persistent";

/** Shared decision point for new ERP events; no UI library is selected by the event producer. */
export function routeNotification(kind: NotificationEventKind): NotificationRoute {
  switch (kind) {
    case "routine_success":
    case "recoverable_error":
      return "toast";
    case "contextual_warning":
      return "inline";
    case "operational_failure":
      return "persistent";
  }
}
