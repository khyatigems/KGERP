import { Metadata } from "next";
import { ListingForm } from "@/components/listings/listing-form";

export const metadata: Metadata = {
  title: "New Listing | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add Listing</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <ListingForm />
        </div>
      </div>
    </div>
  );
}
