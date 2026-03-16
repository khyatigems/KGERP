import fs from "fs";
import path from "path";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const root = "d:/khyatigems-erp";
const reportRouteFiles = [
  "/reports/inventory",
  "/reports/inventory-aging",
  "/reports/vendor-inventory",
  "/reports/category-stock",
  "/reports/sales",
  "/reports/turnover-report",
  "/reports/top-categories",
  "/reports/sales-cycle",
  "/reports/profit",
  "/reports/payments",
  "/reports/invoices",
  "/reports/expenses",
  "/reports/vendor-purchases",
  "/reports/vendor-dependency",
  "/reports/label-printing",
  "/reports/user-activity",
  "/reports/system-logs",
  "/reports/customer-intelligence",
  "/reports/top-customers",
  "/reports/purchase-timeline"
];

const seen = new Set<string>();
for (const route of reportRouteFiles) {
  assert(!seen.has(route), `Duplicate route declared: ${route}`);
  seen.add(route);
  const full = path.join(root, "app", "(dashboard)", route.replace(/^\//, ""), "page.tsx");
  assert(fs.existsSync(full), `Missing report route file: ${full}`);
}

const reportHub = fs.readFileSync(path.join(root, "app", "(dashboard)", "reports", "page.tsx"), "utf8");
for (const route of reportRouteFiles) {
  assert(reportHub.includes(`href: "${route}"`) || reportHub.includes(`href="${route}"`) || reportHub.includes(`href={\"${route}\"}`), `Route not linked from reports hub: ${route}`);
}

console.log("reports-route-resolution.unit.ts passed");
