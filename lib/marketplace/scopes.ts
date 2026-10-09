export const EBAY_INVENTORY_WRITE_SCOPE = "https://api.ebay.com/oauth/api_scope/sell.inventory";

export function hasOAuthScope(scopes: string | null | undefined, required: string): boolean {
  return (scopes || "").split(/\s+/).includes(required);
}

// An omitted scope uses the consent/previous grant. An explicit empty scope
// or reduced grant must never be replaced with requested permissions.
export function resolveOAuthScopes(returned: unknown, fallback?: string | null): string | null {
  return typeof returned === "string" ? returned.trim() : fallback ?? null;
}
