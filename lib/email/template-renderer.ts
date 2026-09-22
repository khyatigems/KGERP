export type TemplateVariables = Record<string, string | number>;

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Safe template renderer. Only performs `{{ variable }}` substitution — no
 * arbitrary code execution. Values are HTML-escaped for HTML bodies.
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables,
  options: { escape?: boolean } = {}
): string {
  const shouldEscape = options.escape ?? true;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (!(key in variables)) return match;
    const value = variables[key];
    return shouldEscape ? escapeHtml(value) : String(value);
  });
}

export const COMMON_TEMPLATE_VARIABLES = [
  "customer_name",
  "order_number",
  "invoice_number",
  "certificate_number",
  "gemstone_name",
  "carat_weight",
  "company_name",
] as const;
