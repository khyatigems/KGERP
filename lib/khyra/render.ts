import type { KhyraDefinition, KhyraDialogue, KhyraEvidence } from "./types";

const privateOrTechnical = /\b(?:prisma\w*|sqlite\w*|sql|sqlstate|libsql|postgres(?:ql)?|constraint|stack trace|ECONN\w*|P\d{4})\b|\b(?:internal server error|database error)\b|Error:\s|\s+at\s+[\w.$]+\s*\(|(?:password|secret|authToken|access_token|session_token|token|database_url|private_key|client_secret|api[_-]?key)\s*[:=]|Bearer\s+\S+|:\/\/[^\s/]+:[^\s@]+@/i;
export function safeKhyraText(value: unknown, maxLength = 500): string | undefined {
  if (typeof value !== "string" || privateOrTechnical.test(value) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) return undefined;
  const text = value.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, maxLength) : undefined;
}
export type KhyraRenderOptions = { evidence: KhyraEvidence; permissions?: readonly string[]; signedIn?: boolean; preview?: boolean };
export function renderKhyraDefinition(definition: KhyraDefinition, supplied: Readonly<Record<string, unknown>>, options: KhyraRenderOptions): KhyraDialogue | null {
  if (options.evidence !== definition.requiredEvidence) return null;
  if (definition.support === "prepared_template" && !options.preview) return null;
  const values: Record<string, string> = {};
  for (const [name, variable] of Object.entries(definition.variables)) {
    const value = supplied[name];
    if (variable.type === "number" || variable.type === "count") {
      if (typeof value === "number" && Number.isFinite(value) && value >= 0 && (variable.type !== "count" || Number.isSafeInteger(value))) values[name] = variable.type === "count" ? value.toLocaleString("en-IN") : String(value);
    } else if (variable.type === "identifier") {
      if (typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value)) values[name] = value;
    } else {
      const safe = safeKhyraText(value, variable.maxLength);
      if (safe) values[name] = safe;
    }
  }
  if (["inventory.images_missing", "inventory.certificates_missing", "marketplace.jobs_stuck", "reports.exports_failed", "receivables.outstanding"].includes(definition.id) && supplied.affected_count === 0) return null;
  const fill = (template: string) => template
    .replace(/\[\[([\s\S]*?)\]\]/g, (_match, text: string) => [...text.matchAll(/\{([a-z_]+)\}/g)].every(match => values[match[1]] !== undefined) ? text : "")
    .replace(/\{([a-z_]+)\}/g, (_match, name: string) => values[name] || "")
    .replace(/\s+/g, " ").trim();
  const permissions = options.permissions || [];
  const actions = definition.support === "prepared_template" || !options.signedIn ? [] : definition.availableActions.filter(action =>
    /^\/(?!\/)/.test(action.href) && !/[\\\x00-\x20]/.test(action.href) && (!action.permission || permissions.includes("ALL") || permissions.includes(action.permission)));
  return {
    eventId: definition.id, module: definition.module, severity: definition.severity, expression: definition.expression,
    short: fill(definition.variants.short), friendly: fill(definition.variants.friendly), detailed: fill(definition.variants.detailed), followUp: fill(definition.variants.followUp),
    ...(definition.variants.urgent ? { urgent: fill(definition.variants.urgent) } : {}), actions,
  };
}
