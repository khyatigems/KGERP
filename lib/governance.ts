import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GOVERNANCE_SETTING_KEYS = {
  freezeMode: "governance_freeze_mode",
  blockSaleWithoutCertification: "governance_block_sale_without_cert",
  blockInvoiceWithoutCustomerName: "governance_block_invoice_without_customer_name",
  minImagesForListing: "governance_min_images_for_listing",
} as const;

export type GovernanceConfig = {
  freezeMode: boolean;
  blockSaleWithoutCertification: boolean;
  blockInvoiceWithoutCustomerName: boolean;
  minImagesForListing: number;
};

function toBool(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function toInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.floor(num));
}

export async function getGovernanceConfig(): Promise<GovernanceConfig> {
  const keys = Object.values(GOVERNANCE_SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  return {
    freezeMode: toBool(map.get(GOVERNANCE_SETTING_KEYS.freezeMode), false),
    blockSaleWithoutCertification: toBool(map.get(GOVERNANCE_SETTING_KEYS.blockSaleWithoutCertification), false),
    blockInvoiceWithoutCustomerName: toBool(map.get(GOVERNANCE_SETTING_KEYS.blockInvoiceWithoutCustomerName), false),
    minImagesForListing: toInt(map.get(GOVERNANCE_SETTING_KEYS.minImagesForListing), 0),
  };
}

export async function assertNotFrozen(actionName: string) {
  const config = await getGovernanceConfig();
  if (config.freezeMode) {
    throw new Error(`System Freeze Mode is enabled. ${actionName} is temporarily blocked.`);
  }
  return config;
}

export async function getFreezeBlockedResponse(actionName: string) {
  const config = await getGovernanceConfig();
  if (!config.freezeMode) return null;
  return NextResponse.json(
    { error: `System Freeze Mode is enabled. ${actionName} is temporarily blocked.` },
    { status: 423 }
  );
}

type FreezeWrapperOptions<TArgs extends unknown[]> = {
  onBlocked?: (...args: TArgs) => Response | Promise<Response>;
};

function requestMetaFromArgs<TArgs extends unknown[]>(args: TArgs) {
  const first = args[0];
  if (!first || typeof first !== "object") return null;
  const maybeReq = first as { method?: string; url?: string; headers?: { get?: (name: string) => string | null } };
  const method = typeof maybeReq.method === "string" ? maybeReq.method : null;
  const url = typeof maybeReq.url === "string" ? maybeReq.url : null;
  const userAgent = maybeReq.headers?.get?.("user-agent") || null;
  const ipAddress = maybeReq.headers?.get?.("x-forwarded-for") || null;
  return { method, url, userAgent, ipAddress };
}

async function logFreezeBlocked(actionName: string, details: ReturnType<typeof requestMetaFromArgs>) {
  try {
    await prisma.activityLog.create({
      data: {
        entityType: "Governance",
        entityIdentifier: actionName,
        actionType: "FREEZE_BLOCKED",
        source: "API",
        userName: "System",
        userId: "SYSTEM",
        userAgent: details?.userAgent || undefined,
        ipAddress: details?.ipAddress || undefined,
        fieldChanges: JSON.stringify({
          method: details?.method || null,
          url: details?.url || null
        })
      }
    });
  } catch {
    return;
  }
}

export function withFreezeGuard<TArgs extends unknown[]>(
  actionName: string,
  handler: (...args: TArgs) => Response | Promise<Response>,
  options?: FreezeWrapperOptions<TArgs>
) {
  return async (...args: TArgs) => {
    const blocked = await getFreezeBlockedResponse(actionName);
    if (blocked) {
      await logFreezeBlocked(actionName, requestMetaFromArgs(args));
      if (options?.onBlocked) {
        return options.onBlocked(...args);
      }
      return blocked;
    }
    return handler(...args);
  };
}
