"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { DateRangePickerWithPresets } from "@/components/ui/date-range-picker-with-presets";
import { useState } from "react";

export function ReportFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [date, setDate] = useState<DateRange | undefined>({
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : addDays(new Date(), -30),
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date(),
  });

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    
    if (newDate?.from) {
      const params = new URLSearchParams(searchParams);
      params.set("from", format(newDate.from, "yyyy-MM-dd"));
      if (newDate.to) {
        params.set("to", format(newDate.to, "yyyy-MM-dd"));
      } else {
        params.delete("to");
      }
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-lg border shadow-sm">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date Range</span>
        <DateRangePickerWithPresets date={date} onDateChange={handleDateChange} />
      </div>
      {/* Add more filters here later (Category, Type, etc.) */}
    </div>
  );
}
