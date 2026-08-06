import { NextResponse } from "next/server";
import { getDefaultProfile, isPricingEngineEnabled } from "@/lib/pricing/db";
import { ensurePricingEngineSchema } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensurePricingEngineSchema();
  const [enabled, profile] = await Promise.all([isPricingEngineEnabled(), getDefaultProfile()]);

  return NextResponse.json({
    enabled,
    defaultProfile: profile
      ? {
          name: profile.name,
          displayName: profile.displayName,
          currency: profile.currency,
          marginType: profile.marginType,
          marginValue: profile.marginValue,
          charges: profile.charges.map((c) => ({
            chargeKey: c.chargeKey,
            name: c.name,
            enabled: c.enabled,
            amountType: c.amountType,
            amount: c.amount,
          })),
        }
      : null,
  });
}
