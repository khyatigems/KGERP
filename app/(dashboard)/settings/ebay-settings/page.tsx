import { EbaySettingsForm } from "./ebay-settings-form";
import { getEbaySettingsAction } from "@/app/settings/ebay/actions";

export const metadata = {
  title: "eBay Settings",
  description: "Manage eBay product description images by category",
};

export default async function EbaySettingsPage() {
  const result = await getEbaySettingsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">eBay Product Description Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure category-specific images for eBay product descriptions. These images will be used when generating HTML descriptions for items.
        </p>
      </div>

      <EbaySettingsForm initialData={result.success ? result.data : null} />
    </div>
  );
}
