import fs from "fs";
import path from "path";
import crypto from "crypto";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function fingerprint(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

const root = "d:/khyatigems-erp";
const vendorIntelligencePages = [
  "vendor-purchases",
  "vendor-inventory",
  "vendor-dependency"
];

const signatures = new Map<string, string>();
for (const page of vendorIntelligencePages) {
  const file = path.join(root, "app", "(dashboard)", "reports", page, "page.tsx");
  assert(fs.existsSync(file), `Missing page for snapshot: ${file}`);
  const text = fs.readFileSync(file, "utf8");
  const h1Match = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  assert(h1Match?.[1], `Missing h1 heading in ${page}`);
  const hash = fingerprint(text.replace(/\s+/g, " "));
  signatures.set(page, hash);
}

const uniqueHashes = new Set(signatures.values());
assert(uniqueHashes.size === vendorIntelligencePages.length, "Vendor intelligence pages must have unique DOM snapshots");

console.log("reports-dom-snapshot.unit.ts passed");
