import { redirect } from "next/navigation";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { getProfiles } from "@/lib/pricing/db";
import { ensurePricingEngineSchema } from "@/lib/prisma";
import { AnimatedPage } from "@/components/ui/animated-page";
import { MarketplaceSettingsForm } from "./marketplace-settings-form";
import { CurrencyRatesEditor } from "./currency-rates-editor";
import { getCurrencyRatesDto } from "./actions";

export const dynamic = "force-dynamic";

export default async function MarketplaceSettingsPage() {
  const perm = await checkPermission(PERMISSIONS.MARKETPLACE_SETTINGS_MANAGE);
  if (!perm.success) {
    redirect("/");
  }

  await ensurePricingEngineSchema();
  const profiles = await getProfiles();
  const currencyRates = await getCurrencyRatesDto();

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marketplace Settings</h1>
          <p className="text-muted-foreground text-sm">
            Master source for marketplace costs and pricing. Configure fee schedules and profit margins
            per marketplace — nothing is hardcoded.
          </p>
        </div>
        <MarketplaceSettingsForm initialProfiles={profiles} />
        <CurrencyRatesEditor initialRates={currencyRates} />
      </div>
    </AnimatedPage>
  );
}
