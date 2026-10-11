import fs from "fs";
import { REPORT_CATALOG } from "../../lib/report-catalog";
import path from "path";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const root = process.cwd();
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

const reportHub = fs.readFileSync(path.join(root, "lib", "report-catalog.ts"), "utf8");
const actualRoutes = fs.readdirSync(path.join(root, "app", "(dashboard)", "reports"), { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(root, "app", "(dashboard)", "reports", d.name, "page.tsx"))).map(d => `/reports/${d.name}`);
assert(new Set(REPORT_CATALOG.map(r => r.href)).size === REPORT_CATALOG.length, "Report catalog must not duplicate routes");
for (const route of actualRoutes) assert(REPORT_CATALOG.some(r => r.href === route), `Report missing from catalog: ${route}`);
for (const route of reportRouteFiles) {
  assert(reportHub.includes(`"href": "${route}"`), `Route not linked from reports hub: ${route}`);
}

console.log("reports-route-resolution.unit.ts passed");
