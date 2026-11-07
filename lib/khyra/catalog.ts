import modulesData from "./modules.json";
import workflowsData from "./workflows.json";
import specialData from "./special-messages.json";
import type { KhyraAction, KhyraDefinition, KhyraEvidence, KhyraExpression, KhyraSupport, KhyraVariable } from "./types";

type Module = { id: string; name: string; href: string; permission: string | null; sources: string[]; support: KhyraSupport };
type Workflow = { id: string; module: string; progress: string; success: string; friendly: string; sources: string[]; support: KhyraSupport };
export const KHYRA_MODULES = modulesData as Module[];
const modules = new Map(KHYRA_MODULES.map(domain => [domain.id, domain]));
const variableTypes: Record<string, KhyraVariable> = {
  context_summary: { type: "text", optional: true, source: "Existing authorised business-event summary; never a raw exception", maxLength: 500 },
  record_label: { type: "text", optional: true, source: "Confirmed record label from the permission-filtered result", maxLength: 120 },
  gemstone_name: { type: "text", optional: true, source: "Confirmed Inventory.itemName", maxLength: 120 },
  carat_weight: { type: "number", optional: true, source: "Confirmed carat weight; never infer carats from another unit" },
  affected_count: { type: "count", optional: true, source: "Verified affected-record count from the authorised query" },
  report_period: { type: "text", optional: true, source: "Actual requested/generated report period", maxLength: 100 },
  marketplace_name: { type: "text", optional: true, source: "Verified marketplace connection/provider name", maxLength: 60 },
  tracking_code: { type: "text", optional: true, source: "Confirmed tracking code from the authorised order", maxLength: 100 },
  order_number: { type: "text", optional: true, source: "Confirmed permitted order reference", maxLength: 80 },
};
export const KHYRA_PREPARED_LABEL = "Prepared template — not connected to a verified ERP trigger";
export function finaliseDefinition(input: Omit<KhyraDefinition, "variables" | "supportLabel">): KhyraDefinition {
  const names = new Set(Object.values(input.variants).flatMap(value => [...value.matchAll(/\{([a-z_]+)\}/g)].map(match => match[1])));
  const variables = Object.fromEntries([...names].map(name => {
    if (!variableTypes[name]) throw new Error(`Khyra variable ${name} has no verified source definition`);
    return [name, variableTypes[name]];
  }));
  return { ...input, variables, supportLabel: input.support === "prepared_template" ? KHYRA_PREPARED_LABEL : "Catalogued from an existing ERP source; emit only after its trigger is confirmed", availableActions: input.support === "prepared_template" ? [] : input.availableActions };
}
const actionLabel: Record<string, string> = { inventory: "View Inventory", media: "Review Products", orders: "Open Orders", marketplace: "Review Sync History", reports: "View Reports", customers: "View Customers", notes: "Open Notes", packaging: "Review Packaging", labels: "View Label Jobs", security: "Open Security Settings", payments: "Review Invoices", settings: "Open Settings" };
export function moduleActions(moduleId: string): KhyraAction[] {
  const domain = modules.get(moduleId);
  if (!domain || domain.support === "prepared_template") return [];
  return [{ id: `${moduleId}.review`, label: actionLabel[moduleId] || `Review ${domain.name}`, href: domain.href, permission: domain.permission, requiresSession: true, kind: "navigate" }];
}
const savedWorkflows = new Set(["inventory.create", "purchases.create", "quotations.create", "sales.create", "invoices.create", "payments.record", "reports.export", "reports.generate", "weekly_reports.prepare"]);
function workflowDefinitions(workflow: Workflow): KhyraDefinition[] {
  const domain = modules.get(workflow.module)!;
  const action = moduleActions(workflow.module);
  const specific = workflow.id.replaceAll("_", " ");
  const shared = { module: workflow.module, sources: workflow.sources, support: workflow.support, availableActions: action };
  const sourceCondition = `Use the permission-checked ${specific} workflow. `;
  const seed = [...workflow.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4;
  const progressVoice = [
    `I'm ${workflow.progress.toLowerCase()}. I'll share the confirmed result.`,
    `${workflow.progress}. You can keep working while it runs.`,
    `Let me take care of this step: ${workflow.progress.toLowerCase()}.`,
    `This request is in progress: ${workflow.progress.toLowerCase()}. I'll wait for its confirmed result.`,
  ][seed];
  const failureVoice = [
    `I couldn't finish ${workflow.progress.toLowerCase()}. Shall we check the existing record before trying again?`,
    `That step needs a closer look: ${workflow.progress.toLowerCase()}. Let's check the saved record first.`,
    `I noticed a problem while ${workflow.progress.toLowerCase()}. Shall we review the details?`,
    `Something interrupted ${workflow.progress.toLowerCase()}. Please review the record before repeating it.`,
  ][seed];
  const started = finaliseDefinition({ ...shared, id: `${workflow.id}.started`, eventName: `${workflow.progress} — started`, triggerCondition: sourceCondition + "The backend accepted processing or the requested operation is genuinely in flight. Merely opening the page is not this trigger.", requiredEvidence: "started", severity: "informational", expression: workflow.module === "search" || workflow.id.includes("suggest") || workflow.id.includes("validate") ? "thinking" : "working", persistence: "activity", notificationChannels: ["activity", "companion"], variants: {
    short: `${workflow.progress}…`, friendly: progressVoice, detailed: `I'm working on this request: ${workflow.progress.toLowerCase()}.[[ Reference: {record_label}.]]`, followUp: "You can keep working. Review the result once processing has finished.",
  } });
  let expression: KhyraExpression = ["reports.queue", "communications.queue", "communications.retry", "notes.email", "invoices.email", "weekly_reports.delivery"].includes(workflow.id) ? "working" : ["verification.lookup", "verification.batch", "pricing.suggestion", "pricing.plan", "fulfillment.suggest", "search.query"].includes(workflow.id) ? "speaking" : workflow.id === "work_tracker.pause" ? "rest" : "success";
  if (workflow.id === "work_tracker.start") expression = "working";
  const completed = finaliseDefinition({ ...shared, id: `${workflow.id}.completed`, eventName: `${workflow.progress} — confirmed result`, triggerCondition: sourceCondition + `The authoritative backend confirms the exact result described: ${workflow.success} Queueing, sharing-link preparation and print-file generation are not delivery, sending or physical printing.`, requiredEvidence: "success", severity: "success", expression, persistence: savedWorkflows.has(workflow.id) ? "saved" : "activity", notificationChannels: savedWorkflows.has(workflow.id) ? ["saved", "bell", "activity", "companion"] : ["toast", "activity", "companion"], variants: {
    short: workflow.success, friendly: workflow.friendly,
    detailed: `${workflow.success}[[ Reference: {record_label}.]][[ Affected records: {affected_count}.]][[ {context_summary}]]`,
    followUp: action.length ? `Would you like to review this in ${domain.name.toLowerCase()}?` : "You can review the confirmed result when you're ready.",
  } });
  if (workflow.id === "inventory.create") {
    completed.variants.friendly = "Perfect! Your gemstone[[, {gemstone_name},]] has been added to inventory.[[ Its recorded weight is {carat_weight} carats.]]";
    completed.variants.detailed = "The gemstone has been added to inventory.[[ Name: {gemstone_name}.]][[ Recorded carat weight: {carat_weight}.]][[ {context_summary}]]";
  }
  if (workflow.id === "reports.export" || workflow.id === "reports.generate") completed.variants.friendly = "All done! Your report[[ for {report_period}]] is ready. Shall we take a look?";
  const failure = finaliseDefinition({ ...shared, id: `${workflow.id}.failed`, eventName: `${workflow.progress} — failed or unconfirmed result`, triggerCondition: sourceCondition + "The backend reports a failure. If only the connection/acknowledgement was lost, use general.result_unconfirmed instead. Never turn notification-delivery failure into business-operation failure.", requiredEvidence: "failure", severity: "warning", expression: "concerned", persistence: workflow.module === "integrations" || workflow.id === "reports.export" || workflow.id === "reports.generate" ? "saved_issue" : "activity", notificationChannels: workflow.module === "integrations" || workflow.module === "reports" ? ["saved", "bell", "activity", "companion"] : ["toast", "activity", "companion"], variants: {
    short: `I couldn't confirm the result: ${workflow.progress.toLowerCase()}.`,
    friendly: failureVoice,
    detailed: `This request needs review: ${workflow.progress.toLowerCase()}. A successful result was not confirmed.[[ Reference: {record_label}.]]`,
    urgent: `Please review this before continuing: ${workflow.progress.toLowerCase()}. Check the record before repeating the action.`,
    followUp: `Shall we review ${domain.name.toLowerCase()} and check the next safe step?`,
  } });
  return [started, finaliseDefinition(completed), failure];
}

type Special = { id: string; module: string; eventName: string; triggerCondition: string; requiredEvidence: KhyraEvidence; severity: KhyraDefinition["severity"]; expression: KhyraExpression; variants: KhyraDefinition["variants"]; support?: KhyraSupport; sources?: string[]; persistence?: KhyraDefinition["persistence"] };
const specialDefinitions = (specialData as Special[]).map(item => {
  const domain = modules.get(item.module)!;
  return finaliseDefinition({ ...item, support: item.support || domain.support, sources: item.sources ?? domain.sources, persistence: item.persistence || (item.severity === "warning" || item.severity === "critical" || item.severity === "attention" ? "saved_issue" : "none"), notificationChannels: item.requiredEvidence === "user" ? ["manual", "companion"] : item.severity === "warning" || item.severity === "critical" || item.severity === "attention" ? ["saved", "bell", "companion", "activity"] : ["companion", "activity"], availableActions: moduleActions(item.module) });
});
export const KHYRA_MESSAGE_LIBRARY: readonly KhyraDefinition[] = [...(workflowsData as Workflow[]).flatMap(workflowDefinitions), ...specialDefinitions];
export const KHYRA_MESSAGES_BY_ID = new Map(KHYRA_MESSAGE_LIBRARY.map(definition => [definition.id, definition]));
