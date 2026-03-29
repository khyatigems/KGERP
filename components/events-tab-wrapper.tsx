'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EventsTabWrapper({
  children,
  range,
}: {
  children: React.ReactNode;
  range: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentRange, setCurrentRange] = useState(range);

  useEffect(() => {
    if (range !== currentRange) {
      startTransition(() => {
        setCurrentRange(range);
      });
    }
  }, [range, currentRange, startTransition]);

  const handleTabClick = (newRange: string) => {
    startTransition(() => {
      router.push(`/customers/events?range=${newRange}`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {/* ... (existing header content) ... */}
      </div>

      <div className="inline-flex rounded-md border bg-muted/20 p-1">
        {[
          { key: "today", label: "Today" },
          { key: "7", label: "Upcoming 7" },
          { key: "30", label: "Upcoming 30" },
          { key: "missed", label: "Missed" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabClick(t.key)}
            className={`px-3 py-1.5 text-sm rounded ${currentRange === t.key ? "bg-background border shadow-sm" : "text-muted-foreground"} ${isPending && currentRange !== t.key ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={isPending && currentRange !== t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`transition-opacity duration-300 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {children}
      </div>
    </div>
  );
}