import { Metadata } from "next";
import { AnimatedPage } from "@/components/ui/animated-page";
import { VendorForm } from "@/components/vendors/vendor-form";

export const metadata: Metadata = {
  title: "Add Vendor | KhyatiGems™",
};

export default function NewVendorPage() {
  return (
    <AnimatedPage><div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add Vendor</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <VendorForm />
        </div>
      </div>
    </div></AnimatedPage>
  );
}
