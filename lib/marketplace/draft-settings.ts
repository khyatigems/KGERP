export type DraftSettingKey = "fulfillmentPolicyId" | "paymentPolicyId" | "returnPolicyId" | "shippingProfileId" | "readinessStateId";
export type DraftSettings = Partial<Record<DraftSettingKey, string>>;
export type DraftSettingGroup = {
  key: DraftSettingKey;
  label: string;
  options: Array<{ id: string; name: string }>;
  selectedId: string;
};

export class DraftSettingsError extends Error {}

export function makeDraftSettingGroup(
  key: DraftSettingKey,
  label: string,
  options: DraftSettingGroup["options"],
  preferredId?: string
): DraftSettingGroup {
  return {
    key, label, options,
    selectedId: options.some((option) => option.id === preferredId)
      ? preferredId!
      : options.length === 1 ? options[0].id : "",
  };
}

export function resolveDraftSettings(groups: DraftSettingGroup[], supplied: DraftSettings = {}): DraftSettings {
  return Object.fromEntries(groups.map((group) => {
    const id = supplied[group.key] || group.selectedId;
    if (!group.options.length) throw new DraftSettingsError(`No ${group.label.toLowerCase()} is available in this shop. Add one in the marketplace, then reload shop settings.`);
    if (!id) throw new DraftSettingsError(`Choose a ${group.label.toLowerCase()} from the shop settings before saving this draft.`);
    if (!group.options.some((option) => option.id === id)) throw new DraftSettingsError(`The selected ${group.label.toLowerCase()} is no longer available in this shop. Reload shop settings and choose again.`);
    return [group.key, id];
  }));
}

export function parseEbayDefaultPolicyIds(xml: string): DraftSettings {
  const ids: DraftSettings = {};
  const keys: Record<string, DraftSettingKey> = { SHIPPING: "fulfillmentPolicyId", PAYMENT: "paymentPolicyId", RETURN_POLICY: "returnPolicyId" };
  for (const match of xml.matchAll(/<SupportedSellerProfile\b[^>]*>([\s\S]*?)<\/SupportedSellerProfile>/gi)) {
    const block = match[1];
    const type = block.match(/<ProfileType>([^<]+)<\/ProfileType>/i)?.[1]?.trim();
    const id = block.match(/<ProfileID>([^<]+)<\/ProfileID>/i)?.[1]?.trim();
    const defaultForAll = [...block.matchAll(/<CategoryGroup\b[^>]*>([\s\S]*?)<\/CategoryGroup>/gi)].some((group) =>
      /<Name>\s*ALL\s*<\/Name>/i.test(group[1]) && /<IsDefault>\s*(?:true|1)\s*<\/IsDefault>/i.test(group[1])
    );
    if (type && keys[type] && id && defaultForAll) ids[keys[type]] = id;
  }
  return ids;
}
