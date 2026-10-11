export function permissionLabel(value: string) {
  return value.toLowerCase().replace(/[_:]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
export function isProtectedRole(name?: string | null) {
  return ["SUPER_ADMIN", "SUPERADMIN", "ADMINISTRATOR"].includes((name || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"));
}
const special: Record<string, string> = {
  "sales:view": "View sales, invoices, sales returns, replacement invoices, and customer advances.",
  "sales:create": "Create sales and initiate sales returns or replacement workflows.",
  "receivables:view": "View customer balances, statements, and credit notes.",
  "inventory:view": "View stock, item details, and matched gemstone pairs; use inventory label workflows.",
  "inventory:create": "Add or copy stock, import inventory, and create purchases that receive stock.",
  "inventory:edit": "Edit inventory details and use bulk editing workflows.",
  "settings:manage": "Configure ERP masters, invoice settings, promotions, loyalty, coupons, message and email templates, packaging settings, marketplace connections, and administrative reconciliation. Role permission editing remains restricted to superadmin.",
  "advances:manage": "View, record, and apply customer advances to invoices. Existing Sales Create or Receivables Manage access also permits managing advances.",
  "reports:customer_insights": "Access Customer Intelligence, Top Customers, and Purchase Timeline. Also requires Reports View. Existing admin access is retained.",
  "labels:view": "Open label management, add stock to your print cart, print labels, and view or reprint label history. Existing Inventory View access also permits these workflows.",
  "activity:view": "View and filter your own activity log. Only superadmin can view other users’ activity.",
  "customers:merge": "Merge duplicate customers and transfer their sales, quotations, and credit notes to the retained customer. Existing Users Manage access also permits merging.",
  "reports:view": "Open the report library and operational reports. Financial and supplier reports have additional access controls.",
  "purchases:view": "View purchase records and supplier purchase history. Creating purchases and importing stock also require Inventory Create.",
  "listings:view": "Use the marketplace control center, listings, listing creation, drafts, orders, sync history, conflicts, and reconciliation.",
  "vendors:manage": "Create and edit supplier records and manage supplier information.",
  "receivables:manage": "Manage collections and customer receivable workflows.",
  "communication:manage": "Manage customer communication and related messaging workflows.",
  "packaging:manage": "Manage packaging, serialized units, and packaging workflows.",
  "inventory:view_cost": "See purchase costs and cost-sensitive inventory details.",
  "marketplace:settings_manage": "Configure marketplace connections, listing settings, and pricing rules.",
  "invoices:manage": "Manage invoice records, payments, and invoice workflows.",
  "customers:manage": "Manage customer records and related customer workflows.",
  "users:manage": "Add and edit users, assign roles, and manage user access. Role changes remain restricted to superadmin.",
  "settings:landing_page": "Edit the public landing page settings and content.",
  "reports:financial": "Access financial reports such as profit, margins, and GST.",
  "reports:vendor": "Access supplier purchase, stock, and dependency reports.",
  "packaging:print": "Print packaging labels and serialized unit labels.",
};
export function permissionDescription(p: { key: string; module: string; action: string; description?: string | null }) {
  if (special[p.key]) return special[p.key];
  if (p.description) return p.description;
  const moduleName = permissionLabel(p.module).toLowerCase();
  const verbs: Record<string, string> = { view: "View", create: "Create new", edit: "Edit existing", delete: "Delete", approve: "Approve", export: "Download exports of", manage: "Manage settings and workflows for" };
  return `${verbs[p.action] || permissionLabel(p.action)} ${moduleName}${["view", "create", "edit", "delete", "approve"].includes(p.action) ? " records" : ""}.`;
}
