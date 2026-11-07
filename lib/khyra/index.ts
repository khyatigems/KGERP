import { KHYRA_MESSAGES_BY_ID } from "./catalog";
import { renderKhyraDefinition, type KhyraRenderOptions } from "./render";
export { KHYRA_MESSAGE_LIBRARY, KHYRA_MODULES, KHYRA_PREPARED_LABEL } from "./catalog";
export { KHYRA, khyraGreeting } from "./identity";
export type * from "./types";
export function renderKhyraMessage(id: string, variables: Readonly<Record<string, unknown>>, options: KhyraRenderOptions) {
  const definition = KHYRA_MESSAGES_BY_ID.get(id);
  return definition ? renderKhyraDefinition(definition, variables, options) : null;
}
