"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SalesSortToggle() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const sort = sp.get("sort") === "invoice" ? "invoice" : "date";

  return (
    <Select
      value={sort}
      onValueChange={(val) => {
        const params = new URLSearchParams(sp);
        if (val === "date") params.delete("sort");
        else params.set("sort", "invoice");
        router.replace(`${pathname}?${params.toString()}`);
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="date">Sort by Date</SelectItem>
        <SelectItem value="invoice">Sort by Invoice</SelectItem>
      </SelectContent>
    </Select>
  );
}

