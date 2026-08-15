"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition } from "react";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";

type MasterOption = { id: string; name: string };

function getMultiValues(searchParams: URLSearchParams, key: string) {
  const raw = searchParams.get(key);
  return raw ? raw.split(",").filter(Boolean) : [];
}

export function ReportMultiFilter({
  categories,
  gemstones,
  colors,
}: {
  categories: MasterOption[];
  gemstones: MasterOption[];
  colors: MasterOption[];
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleChange = (key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (values.length > 0) {
      params.set(key, values.join(","));
    } else {
      params.delete(key);
    }
    startTransition(() => {
      replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <MultiSelectFilter
        options={categories.map((c) => ({ value: c.name, label: c.name }))}
        selected={getMultiValues(searchParams, "category")}
        onChange={(values) => handleChange("category", values)}
        placeholder="Category"
      />
      <MultiSelectFilter
        options={gemstones.map((g) => ({ value: g.name, label: g.name }))}
        selected={getMultiValues(searchParams, "gemType")}
        onChange={(values) => handleChange("gemType", values)}
        placeholder="Gem Type"
      />
      <MultiSelectFilter
        options={colors.map((c) => ({ value: c.id, label: c.name }))}
        selected={getMultiValues(searchParams, "color")}
        onChange={(values) => handleChange("color", values)}
        placeholder="Color"
      />
    </div>
  );
}