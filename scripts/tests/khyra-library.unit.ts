import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { KHYRA_MESSAGE_LIBRARY, KHYRA_MODULES, KHYRA_PREPARED_LABEL, renderKhyraMessage, KHYRA } from "../../lib/khyra";
import { khyraFeedbackDialogue, khyraSavedDialogue } from "../../lib/khyra/live";
import { safeKhyraText } from "../../lib/khyra/render";
import { companionPoseForState, type CompanionPoseContext } from "../../lib/companion-avatar";

async function main() {
  assert.equal(KHYRA.introduction, "I'm Khyra! How can I make your work easier today?");
  assert.ok(KHYRA_MESSAGE_LIBRARY.length >= 700);
  assert.ok(KHYRA_MODULES.length >= 40);
  assert.equal(new Set(KHYRA_MESSAGE_LIBRARY.map(event => event.id)).size, KHYRA_MESSAGE_LIBRARY.length);
  for (const event of KHYRA_MESSAGE_LIBRARY) {
    assert.ok(event.triggerCondition && event.eventName && event.expression && event.persistence && event.notificationChannels.length);
    assert.ok(new Set(Object.values(event.variants)).size >= 3, `${event.id} needs genuine style variation`);
    const plain = renderKhyraMessage(event.id, {}, { evidence: event.requiredEvidence, preview: true });
    assert.ok(plain?.short && plain.friendly && plain.detailed && plain.followUp);
    assert.doesNotMatch(Object.values(plain).filter(value => typeof value === "string").join(" "), /\[\[|\]\]|\{[a-z_]+\}/, `${event.id} leaves no missing-data placeholders`);
    assert.deepEqual(plain.actions, [], "actions are unavailable without an authenticated permission context");
    const wrong = event.requiredEvidence === "success" ? "failure" : "success";
    assert.equal(renderKhyraMessage(event.id, {}, { evidence: wrong }), null, `${event.id} rejects the wrong evidence state`);
    if (event.support === "prepared_template") {
      assert.equal(event.supportLabel, KHYRA_PREPARED_LABEL);
      assert.deepEqual(event.availableActions, []);
      assert.equal(renderKhyraMessage(event.id, {}, { evidence: event.requiredEvidence, permissions: ["ALL"], signedIn: true }), null);
    }
    for (const source of event.sources) assert.ok((await readFile(source)).length);
  }
  for (const platform of ["shopify", "pinterest", "amazon", "other"]) {
    const events = KHYRA_MESSAGE_LIBRARY.filter(event => event.id.startsWith(`marketplace.${platform}.`));
    assert.equal(events.length, 13);
    assert.ok(events.every(event => event.support === "prepared_template"));
  }
  for (const domain of ["bookings", "shipping", "tasks", "backup"]) assert.ok(KHYRA_MESSAGE_LIBRARY.filter(event => event.module === domain).every(event => event.support === "prepared_template"));
  const generic = renderKhyraMessage("inventory.create.completed", {}, { evidence: "success" })!;
  assert.equal(generic.friendly, "Perfect! Your gemstone has been added to inventory.");
  const named = renderKhyraMessage("inventory.create.completed", { gemstone_name: "Ruby", carat_weight: 3.25 }, { evidence: "success", signedIn: true, permissions: ["inventory:view"] })!;
  assert.match(named.friendly, /Ruby/); assert.match(named.friendly, /3\.25 carats/); assert.equal(named.actions.length, 1);
  const restricted = renderKhyraMessage("inventory.create.completed", { gemstone_name: "Ruby" }, { evidence: "success", signedIn: true, permissions: ["reports:view"] })!;
  assert.deepEqual(restricted.actions, []);
  const malicious = renderKhyraMessage("inventory.create.completed", { gemstone_name: "postgres://user:password@internal", carat_weight: Number.NaN, context_summary: "Prisma P2021: database error" }, { evidence: "success" })!;
  assert.equal(malicious.friendly, generic.friendly);
  assert.doesNotMatch(malicious.detailed, /password|Prisma|NaN/);
  assert.equal(safeKhyraText("token=private"), undefined);
  assert.equal(safeKhyraText("access_token=private"), undefined);
  assert.equal(renderKhyraMessage("inventory.certificates_missing", { affected_count: 0 }, { evidence: "observed" }), null);
  const counted = renderKhyraMessage("inventory.certificates_missing", { affected_count: 12 }, { evidence: "observed" })!;
  assert.match(counted.detailed, /12/); assert.equal(counted.expression, "alert");
  assert.equal(khyraSavedDialogue({ eventKey: "marketplace-sync:job", type: "error", title: "ETSY orders sync failed", message: "Shop A needs review" })?.expression, "concerned");
  assert.match(khyraSavedDialogue({ eventKey: "marketplace-sync:job", type: "error", title: "ETSY orders sync failed", message: "Shop A needs review" })!.friendly, /Etsy/);
  assert.equal(khyraSavedDialogue({ eventKey: "sale-created:invoice", type: "error", title: "Failed", message: "Not completed" }), null, "never infer success from a key with a failing state");
  assert.equal(khyraSavedDialogue({ eventKey: "unknown", type: "info", title: "Unknown", message: "Existing feedback" }), null);
  assert.equal(khyraSavedDialogue({ eventKey: "marketplace-sync:job", type: "error", title: "Issue", message: "Old issue", resolvedAt: "2026-11-07T00:00:00Z" })?.eventId, "general.recovery_verified");
  assert.equal(khyraFeedbackDialogue("error", "Quotation saved successfully"), null);
  assert.equal(khyraFeedbackDialogue("success", "Quotation saved successfully")?.eventId, "quotations.create.completed");
  const cases: Array<[string, CompanionPoseContext]> = [
    ["idle", {}], ["idle", { module: "marketplace" }], ["greeting", {}], ["greeting", { eventId: "general.morning" }], ["welcome", { eventId: "general.introduction" }],
    ["ready", { section: "workday" }], ["ready", {}], ["wave", {}], ["thinking", {}], ["thinking", { section: "workday" }], ["working", {}], ["happy", {}], ["happy", { module: "orders" }],
    ["success", { module: "inventory" }], ["success", { module: "sales" }], ["warning", {}], ["warning", { module: "marketplace" }], ["alert", {}], ["speaking", {}], ["speaking", { module: "reports" }], ["sleeping", {}], ["resting", {}],
  ];
  assert.equal(new Set(cases.map(([state, context]) => companionPoseForState(state, "adaptive", context))).size, 4, "four essential event-driven poses cover live states");
  const generated = JSON.parse(await readFile("docs/khyra/message-library.json", "utf8"));
  assert.deepEqual(generated.events, KHYRA_MESSAGE_LIBRARY, "the complete deliverable matches its maintained source");
  console.log(`Khyra library passed: ${KHYRA_MESSAGE_LIBRARY.length} events, prepared-template gates, safe variables, permissions, evidence, shared event identity and four essential live pose mappings.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
