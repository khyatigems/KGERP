"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export type MultiSelectOption = {
  value: string;
  label: string;
};

type MultiSelectFilterProps = {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  maxHeight?: string;
};

export function MultiSelectFilter({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  className,
  maxHeight = "max-h-64",
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>(selected);
  const hasChanges = React.useMemo(
    () => JSON.stringify(draft.sort()) !== JSON.stringify([...selected].sort()),
    [draft, selected]
  );

  React.useEffect(() => {
    if (open) {
      setDraft([...selected]);
    }
  }, [open, selected]);

  const allSelected = React.useMemo(
    () => options.length > 0 && draft.length === options.length,
    [options, draft]
  );

  const toggleDraft = (value: string) => {
    setDraft((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const toggleAllDraft = () => {
    setDraft(allSelected ? [] : options.map((o) => o.value));
  };

  const clearDraft = () => setDraft([]);

  const apply = () => {
    onChange(draft);
    setOpen(false);
  };

  const cancel = () => {
    setDraft([...selected]);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && hasChanges) {
          setDraft([...selected]);
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {selected.length === 0
              ? placeholder
              : selected.length === 1
                ? options.find((o) => o.value === selected[0])?.label || selected[0]
                : selected.length === options.length
                  ? "All selected"
                  : `${selected.length} selected`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-56 p-0" align="start">
        <Command className="w-full">
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <div className="flex items-center justify-between border-b px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={toggleAllDraft}
            >
              {allSelected ? "Clear All" : "Select All"}
            </Button>
            {draft.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive"
                onClick={clearDraft}
              >
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>
          <CommandList className={maxHeight}>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggleDraft(option.value)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border mr-2",
                      draft.includes(option.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    )}
                  >
                    {draft.includes(option.value) && <Check className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="flex items-center justify-end gap-2 border-t px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={cancel}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={apply} disabled={!hasChanges}>
            Apply
          </Button>
        </div>
      </PopoverContent>
      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {selected.slice(0, 5).map((value) => {
            const label = options.find((o) => o.value === value)?.label || value;
            return (
              <Badge key={value} variant="secondary" className="gap-1 pr-1">
                {label}
                <button
                  type="button"
                  aria-label={`Remove ${label}`}
                  className="rounded-full p-0 focus:outline-none"
                  onClick={() => onChange(selected.filter((v) => v !== value))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {selected.length > 5 && (
            <Badge variant="secondary">+{selected.length - 5} more</Badge>
          )}
        </div>
      )}
    </Popover>
  );
}