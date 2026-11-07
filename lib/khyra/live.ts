import liveData from "./live-messages.json";
import { KHYRA_FEEDBACK_BINDINGS, KHYRA_SAVED_BINDINGS } from "./bindings";
import { renderKhyraDefinition, safeKhyraText, type KhyraRenderOptions } from "./render";
import type { KhyraDefinition, KhyraDialogue } from "./types";

// Generated subset: the 703-event authoring catalog is not shipped to every ERP page.
const live = new Map((liveData as KhyraDefinition[]).map(definition => [definition.id, definition]));
export function liveKhyraMessage(id: string, variables: Readonly<Record<string, unknown>>, options: KhyraRenderOptions): KhyraDialogue | null {
  const definition = live.get(id);
  return definition ? renderKhyraDefinition(definition, variables, options) : null;
}
type SavedNotice = { eventKey?: string; type: string; title: string; message: string; resolvedAt?: string | Date | null };
export function khyraSavedDialogue(notice: SavedNotice) {
  if (notice.resolvedAt) return liveKhyraMessage("general.recovery_verified", { context_summary: notice.message }, { evidence: "success" });
  const binding = KHYRA_SAVED_BINDINGS.find(binding => notice.eventKey?.startsWith(binding.prefix) && notice.type === binding.type && (!("suffix" in binding) || notice.eventKey.endsWith(binding.suffix)));
  if (!binding) return null;
  const definition = live.get(binding.event);
  if (!definition) return null;
  const platform = /^(EBAY|ETSY|AMAZON)\b/i.exec(notice.title)?.[1]?.toUpperCase();
  const marketplace_name = platform === "EBAY" ? "eBay" : platform === "ETSY" ? "Etsy" : platform === "AMAZON" ? "Amazon" : undefined;
  return renderKhyraDefinition(definition, { context_summary: notice.message, marketplace_name }, { evidence: definition.requiredEvidence });
}
export function khyraFeedbackDialogue(type: string | undefined, title: string, description?: string, eventKey?: string): KhyraDialogue | null {
  const binding = KHYRA_FEEDBACK_BINDINGS.find(binding => binding.type === type && (binding.text === title || live.get(binding.event)?.variants.short === title));
  if (binding) return liveKhyraMessage(binding.event, { context_summary: description }, { evidence: "success" });
  return eventKey ? khyraSavedDialogue({ eventKey, type: type || "info", title, message: description || title }) : null;
}
export function khyraSafeFallback(value: string) {
  return safeKhyraText(value) || "I couldn't confirm that update. Please review the existing record before trying again.";
}
