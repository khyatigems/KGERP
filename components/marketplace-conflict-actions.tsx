"use client";

import { Button } from "@/components/ui/button";

type ListingUrlMap = {
  EBAY?: string[];
  ETSY?: string[];
  AMAZON?: string[];
};

function openUrls(urls: string[]) {
  for (const url of urls) {
    if (!url) continue;
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function MarketplaceConflictActions({ listingUrls }: { listingUrls: ListingUrlMap }) {
  const ebay = listingUrls.EBAY || [];
  const etsy = listingUrls.ETSY || [];
  const amazon = listingUrls.AMAZON || [];
  const all = [...ebay, ...etsy, ...amazon];

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled={!ebay.length} onClick={() => openUrls(ebay)}>
        Open eBay Listing
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!etsy.length} onClick={() => openUrls(etsy)}>
        Open Etsy Listing
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!amazon.length} onClick={() => openUrls(amazon)}>
        Open Amazon Listing
      </Button>
      <Button type="button" size="sm" disabled={!all.length} onClick={() => openUrls(all)}>
        Open All Listings
      </Button>
    </div>
  );
}
