import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { KHYRA_MESSAGE_LIBRARY, KHYRA_MODULES, KHYRA_PREPARED_LABEL } from "../lib/khyra/catalog";
import { KHYRA_SAVED_BINDINGS, KHYRA_FEEDBACK_BINDINGS } from "../lib/khyra/bindings";
import { KHYRA } from "../lib/khyra/identity";

async function main() {
  const directory = path.resolve("docs/khyra"); await fs.mkdir(directory, { recursive: true });
  for (const filename of ["public/companion/khyati/manifest.json", "scripts/companion-asset-map.json"]) {
    const data = JSON.parse(await fs.readFile(filename, "utf8"));
    await fs.writeFile(filename, JSON.stringify({ ...data, identity: KHYRA.fullIdentity }, null, 2) + "\n");
  }
  const ids = new Set<string>();
  for (const definition of KHYRA_MESSAGE_LIBRARY) {
    if (ids.has(definition.id)) throw new Error(`Duplicate Khyra event: ${definition.id}`);
    ids.add(definition.id);
    for (const source of definition.sources) await fs.access(source);
  }
  const liveIds = new Set(["inventory.create.started", "inventory.create.failed", "inventory.update.started", "inventory.update.failed", ...KHYRA_SAVED_BINDINGS.map(binding => binding.event), ...KHYRA_FEEDBACK_BINDINGS.map(binding => binding.event), ...KHYRA_MESSAGE_LIBRARY.filter(item => item.module === "general" || ["inventory.images_missing", "inventory.certificates_missing", "marketplace.jobs_stuck", "reports.exports_failed"].includes(item.id)).map(item => item.id)]);
  const live = KHYRA_MESSAGE_LIBRARY.filter(definition => liveIds.has(definition.id));
  await fs.writeFile("lib/khyra/live-messages.json", JSON.stringify(live, null, 2) + "\n");
  const files: string[] = [];
  async function walk(directory: string) { for (const entry of await fs.readdir(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) await walk(file); else if (/\.(tsx?|mjs)$/.test(file) && !file.endsWith(".d.ts")) files.push(file.replaceAll("\\", "/")); } }
  for (const root of ["app", "components", "lib"]) await walk(root);
  const sourceInventory = [];
  for (const file of files) {
    const text = await fs.readFile(file, "utf8"); const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const exports: string[] = [], feedback: Array<{ line: number; call: string; text: string | null }> = [];
    function visit(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) && node.name) exports.push(node.name.text);
      if (ts.isCallExpression(node)) {
        const call = node.expression.getText(ast);
        if (/(?:^|\.)(?:toast|notify|notifyAction|notifyFailure|persistNotification|persistNotificationSafely)(?:\.|$)/.test(call)) feedback.push({ line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, call, text: node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) ? node.arguments[0].text : null });
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    const events = KHYRA_MESSAGE_LIBRARY.filter(definition => definition.sources.includes(file)).map(definition => definition.id);
    sourceInventory.push({ file, exports, feedback, events, coverage: events.length ? "catalogued source" : feedback.length ? "existing feedback; unbound copy retained" : file.endsWith("/page.tsx") ? "page/context; no completion event invented" : file.endsWith("/route.ts") ? "API infrastructure; no completion event inferred" : "supporting source" });
  }
  await fs.writeFile(path.join(directory, "source-coverage.json"), JSON.stringify({ scannedFiles: files.length, pages: files.filter(file => file.endsWith("/page.tsx")).length, apiRoutes: files.filter(file => file.endsWith("/route.ts")).length, sources: sourceInventory }, null, 2) + "\n");
  await fs.writeFile(path.join(directory, "message-library.json"), JSON.stringify({ identity: "Khyra – Your KhyatiGems Companion", events: KHYRA_MESSAGE_LIBRARY }, null, 2) + "\n");
  const summary = ["# Khyra Conversational Message Library", "", `Central library: ${KHYRA_MESSAGE_LIBRARY.length} events across ${KHYRA_MODULES.length} modules. Every event has four variants; issues also have an urgent variant.`, "", `Prepared entries are labelled **${KHYRA_PREPARED_LABEL}**. They do not render in live mode and expose no available actions.`, "", "This is a message catalog, not a second notification backend. Catalogued source does not mean an automatic producer has been wired. The exact live bindings are in lib/khyra/bindings.ts. Unknown existing feedback is preserved rather than guessed.", "", "- Full structured deliverable: [message-library.json](message-library.json)", "- Every scanned page/API/source and its coverage status: [source-coverage.json](source-coverage.json)", "", "| Module | Events | Prepared |", "| --- | ---: | ---: |", ...KHYRA_MODULES.map(module => `| ${module.name} | ${KHYRA_MESSAGE_LIBRARY.filter(event => event.module === module.id).length} | ${KHYRA_MESSAGE_LIBRARY.filter(event => event.module === module.id && event.support === "prepared_template").length} |`), ""];
  await fs.writeFile(path.join(directory, "README.md"), summary.join("\n"));
  const lines = ["# Complete event dialogue reference", "", "Generated from the central source. Edit lib/khyra/workflows.json, special-messages.json and catalog.ts, then run npm run build:khyra-library.", ""];
  for (const event of KHYRA_MESSAGE_LIBRARY) {
    lines.push(`## ${event.id}`, "", `- Module: ${event.module}`, `- Trigger: ${event.triggerCondition}`, `- Severity / expression: ${event.severity} / ${event.expression}`, `- Support: ${event.supportLabel}`, `- Persistence / channels: ${event.persistence} / ${event.notificationChannels.join(", ")}`, `- Dynamic variables: ${Object.keys(event.variables).join(", ") || "none"}`, `- Available actions: ${event.availableActions.map(action => `${action.label} (${action.href}; ${action.permission || "authenticated owner/session"})`).join("; ") || "none"}`, `- Sources: ${event.sources.join(", ") || "No verified trigger connected"}`, "", ...Object.entries(event.variants).map(([style, message]) => `**${style}:** ${message}\n`), "");
  }
  await fs.writeFile(path.join(directory, "dialogue-reference.md"), lines.join("\n"));
  console.log(`Khyra library: ${KHYRA_MESSAGE_LIBRARY.length} events; ${KHYRA_MESSAGE_LIBRARY.filter(event => event.support === "prepared_template").length} explicitly prepared; ${live.length} lightweight live definitions; ${files.length} source files scanned.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
