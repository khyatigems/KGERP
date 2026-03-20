"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  defaultDays: 7 | 30 | 90;
};

export function ReportsRangeSelect({ defaultDays }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const value = (() => {
    const raw = searchParams.get("range");
    const n = raw ? Number(raw) : defaultDays;
    if (n === 7 || n === 30 || n === 90) return String(n);
    return String(defaultDays);
  })();

  const onChange = (v: string) => {
    const n = Number(v);
    if (n !== 7 && n !== 30 && n !== 90) return;
    const params = new URLSearchParams(searchParams);
    params.set("range", String(n));
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder="Last 30 Days" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">Last 7 Days</SelectItem>
        <SelectItem value="30">Last 30 Days</SelectItem>
        <SelectItem value="90">Last 90 Days</SelectItem>
      </SelectContent>
    </Select>
  );
}

