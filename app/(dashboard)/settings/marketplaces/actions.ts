"use server";

import crypto from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { ensurePricingEngineSchema, prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";
import { CHARGE_KEYS } from "@/lib/pricing/types";
import { DEFAULT_MARKETPLACE_SETTING } from "@/lib/pricing/constants";

const chargeSchema = z.object({
  id: z.string().optional(),
  chargeKey: z.enum(CHARGE_KEYS),
  name: z.string().min(1),
  enabled: z.boolean(),
  amountType: z.enum(["FLAT", "PERCENT"]),
  amount: z.coerce.number().min(0),
  sortOrder: z.coerce.number().int().min(0).default(0),
  countryCode: z.string().nullable().optional(),
});

const profileSchema = z.object({
  profileId: z.string().min(1),
  name: z.string().min(1),
  displayName: z.string().min(1),
  currency: z.string().min(1),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  marginType: z.enum(["PERCENT", "FLAT"]),
  marginValue: z.coerce.number().min(0),
  charges: z.array(chargeSchema).default([]),
});

const importSchema = z.object({
  profiles: z.array(
    z.object({
      name: z.string().min(1),
      displayName: z.string().min(1),
      currency: z.string().min(1),
      isActive: z.boolean().default(true),
      isDefault: z.boolean().default(false),
      marginType: z.enum(["PERCENT", "FLAT"]).default("PERCENT"),
      marginValue: z.coerce.number().min(0).default(0),
      charges: z.array(chargeSchema).default([]),
    })
  ),
});

export type SaveMarketplaceProfileInput = z.infer<typeof profileSchema>;

async function requirePermission() {
  const perm = await checkPermission(PERMISSIONS.MARKETPLACE_SETTINGS_MANAGE);
  if (!perm.success) return { error: perm.message || "Insufficient permissions" };
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };
  return { session };
}

function normalizeCharges(
  charges: z.infer<typeof chargeSchema>[]
): Array<z.infer<typeof chargeSchema>> {
  return charges.map((c, i) => ({
    ...c,
    chargeKey: c.chargeKey,
    amount: Math.max(0, Number(c.amount) || 0),
    sortOrder: c.sortOrder ?? i,
    countryCode: c.countryCode || null,
  }));
}

export async function saveMarketplaceProfile(input: SaveMarketplaceProfileInput) {
  const guard = await requirePermission();
  if ("error" in guard) return { success: false, message: guard.error };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid profile data" };
  }
  const data = parsed.data;
  await ensurePricingEngineSchema();

  try {
    const profile = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.$executeRawUnsafe(
          `UPDATE "MarketplaceProfile" SET "isDefault" = 0 WHERE "id" != ?`,
          data.profileId
        );
      }
      const updated = await tx.marketplaceProfile.update({
        where: { id: data.profileId },
        data: {
          displayName: data.displayName,
          currency: data.currency,
          isActive: data.isActive,
          isDefault: data.isDefault,
          marginType: data.marginType,
          marginValue: data.marginValue,
        },
      });

      await tx.$executeRawUnsafe(
        `DELETE FROM "MarketplaceCharge" WHERE "profileId" = ?`,
        data.profileId
      );
      const charges = normalizeCharges(data.charges);
      for (const c of charges) {
        await tx.marketplaceCharge.create({
          data: {
            profileId: data.profileId,
            chargeKey: c.chargeKey,
            name: c.name,
            enabled: c.enabled,
            amountType: c.amountType,
            amount: c.amount,
            countryCode: c.countryCode || null,
            sortOrder: c.sortOrder,
          },
        });
      }
      return updated;
    });

    if (data.isDefault) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Setting" ("id", "key", "value", "description", "updatedAt")
         VALUES (?, ?, ?, 'Marketplace profile used for single-row MSP/MRP planning in the Opportunity Report', CURRENT_TIMESTAMP)
         ON CONFLICT("key") DO UPDATE SET "value" = excluded."value", "updatedAt" = CURRENT_TIMESTAMP`,
        crypto.randomUUID(),
        DEFAULT_MARKETPLACE_SETTING,
        profile.name
      );
    }

    await logActivity({
      entityType: "Settings",
      entityId: data.profileId,
      entityIdentifier: `Marketplace Profile ${data.name}`,
      actionType: "UPDATE",
      source: "WEB",
      userId: guard.session.user.id,
      userName: guard.session.user.name || guard.session.user.email || "Unknown",
      details: JSON.stringify({
        displayName: data.displayName,
        marginType: data.marginType,
        marginValue: data.marginValue,
        chargeCount: data.charges.length,
      }),
    });

    revalidateTag("pricing:fees", "default");
    revalidatePath("/settings/marketplaces", "page");
    return { success: true };
  } catch (e) {
    console.error("saveMarketplaceProfile failed:", e);
    return { success: false, message: "Failed to save marketplace profile" };
  }
}

export async function duplicateMarketplaceProfile(profileId: string) {
  const guard = await requirePermission();
  if ("error" in guard) return { success: false, message: guard.error };
  await ensurePricingEngineSchema();

  const source = await prisma.marketplaceProfile.findUnique({
    where: { id: profileId },
    include: { charges: true },
  });
  if (!source) return { success: false, message: "Profile not found" };

  let suffix = 1;
  let newName = `${source.name}_COPY`;
  while (await prisma.marketplaceProfile.findUnique({ where: { name: newName } })) {
    suffix += 1;
    newName = `${source.name}_COPY${suffix}`;
  }

  const created = await prisma.marketplaceProfile.create({
    data: {
      name: newName,
      displayName: `${source.displayName} (Copy)`,
      currency: source.currency,
      isActive: false,
      isDefault: false,
      marginType: source.marginType,
      marginValue: source.marginValue,
      charges: {
        create: (source.charges || []).map((c) => ({
          chargeKey: c.chargeKey,
          name: c.name,
          enabled: c.enabled,
          amountType: c.amountType,
          amount: c.amount,
          countryCode: c.countryCode,
          sortOrder: c.sortOrder,
        })),
      },
    },
  });

  revalidateTag("pricing:fees", "default");
  revalidatePath("/settings/marketplaces", "page");
  return { success: true, profileId: created.id, name: newName };
}

export async function exportMarketplaceSettings(): Promise<{
  success: boolean;
  message?: string;
  json?: string;
}> {
  const guard = await requirePermission();
  if ("error" in guard) return { success: false, message: guard.error };
  await ensurePricingEngineSchema();

  const profiles = await prisma.marketplaceProfile.findMany({
    include: { charges: { orderBy: { sortOrder: "asc" } } },
  });
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles: profiles.map((p) => ({
      name: p.name,
      displayName: p.displayName,
      currency: p.currency,
      isActive: p.isActive,
      isDefault: p.isDefault,
      marginType: p.marginType,
      marginValue: p.marginValue,
      charges: (p.charges || []).map((c) => ({
        chargeKey: c.chargeKey,
        name: c.name,
        enabled: c.enabled,
        amountType: c.amountType,
        amount: c.amount,
        countryCode: c.countryCode,
        sortOrder: c.sortOrder,
      })),
    })),
  };
  return { success: true, json: JSON.stringify(payload, null, 2) };
}

export async function saveCurrencyRates(rates: Array<{ code: string; rateToInr: number }>) {
  const guard = await requirePermission();
  if ("error" in guard) return { success: false, message: guard.error };
  await ensurePricingEngineSchema();

  try {
    await prisma.$transaction(async (tx) => {
      for (const r of rates) {
        const code = String(r.code || "").toUpperCase().trim();
        const value = Math.max(0, Number(r.rateToInr) || 0);
        if (!code) continue;
        const existing = await tx.currencyRate.findUnique({ where: { code } });
        if (existing) {
          await tx.currencyRate.update({ where: { code }, data: { rateToInr: value } });
        } else {
          await tx.currencyRate.create({ data: { code, rateToInr: value, isBase: code === "INR" } });
        }
      }
    });
    revalidateTag("pricing:rates", "default");
    revalidatePath("/settings/marketplaces", "page");
    return { success: true };
  } catch (e) {
    console.error("saveCurrencyRates failed:", e);
    return { success: false, message: "Failed to save currency rates" };
  }
}

export async function getCurrencyRatesDto(): Promise<Array<{ code: string; rateToInr: number; isBase: boolean }>> {
  await ensurePricingEngineSchema();
  const rows = await prisma.currencyRate.findMany({ orderBy: { code: "asc" } });
  return rows.map((r) => ({ code: r.code, rateToInr: Number(r.rateToInr) || 0, isBase: r.isBase }));
}

export async function importMarketplaceSettings(rawJson: string) {
  const guard = await requirePermission();
  if ("error" in guard) return { success: false, message: guard.error };
  await ensurePricingEngineSchema();

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawJson);
  } catch {
    return { success: false, message: "Invalid JSON file" };
  }

  const parsed = importSchema.safeParse(parsedBody);
  if (!parsed.success) {
    return { success: false, message: "Invalid marketplace settings structure" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const p of parsed.data.profiles) {
        const existing = await tx.marketplaceProfile.findUnique({
          where: { name: p.name },
        });
        const profileId = existing?.id || crypto.randomUUID();
        await tx.$executeRawUnsafe(
          `INSERT INTO "MarketplaceProfile" ("id", "name", "displayName", "currency", "isActive", "isDefault", "marginType", "marginValue", "createdAt", "updatedAt")
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT("name") DO UPDATE SET
             "displayName" = excluded."displayName",
             "currency" = excluded."currency",
             "isActive" = excluded."isActive",
             "isDefault" = excluded."isDefault",
             "marginType" = excluded."marginType",
             "marginValue" = excluded."marginValue",
             "updatedAt" = CURRENT_TIMESTAMP`,
          profileId,
          p.name,
          p.displayName,
          p.currency,
          p.isActive ? 1 : 0,
          p.isDefault ? 1 : 0,
          p.marginType,
          p.marginValue
        );
        await tx.$executeRawUnsafe(`DELETE FROM "MarketplaceCharge" WHERE "profileId" = ?`, profileId);
        for (const c of normalizeCharges(p.charges)) {
          await tx.marketplaceCharge.create({
            data: {
              profileId,
              chargeKey: c.chargeKey,
              name: c.name,
              enabled: c.enabled,
              amountType: c.amountType,
              amount: c.amount,
              countryCode: c.countryCode || null,
              sortOrder: c.sortOrder,
            },
          });
        }
      }
    });

    revalidateTag("pricing:fees", "default");
    revalidatePath("/settings/marketplaces", "page");
    return { success: true };
  } catch (e) {
    console.error("importMarketplaceSettings failed:", e);
    return { success: false, message: "Failed to import marketplace settings" };
  }
}
