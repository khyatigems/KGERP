"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./segmented-control.module.css";

/** Selection motion inspired by Motion Primitives; native buttons retain focus. */
export function SegmentedControl<T extends string>({ value, onValueChange, options, label, className }: {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string; icon?: ReactNode; title?: string; disabled?: boolean }[];
  label: string;
  className?: string;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  return <div role="group" aria-label={label} className={cn(styles.control, className)} style={{ "--segments": options.length, "--selected": selected } as CSSProperties}>
    <span className={styles.indicator} aria-hidden="true" />
    {options.map((option, index) => <button
      key={option.value} ref={element => { buttons.current[index] = element; }} type="button"
      aria-pressed={value === option.value} title={option.title || option.label} disabled={option.disabled}
      tabIndex={value === option.value ? 0 : -1} onClick={() => onValueChange(option.value)}
      onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const enabled = options.map((entry, position) => entry.disabled ? -1 : position).filter(position => position >= 0);
        const current = enabled.indexOf(index);
        const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
        const direction = (event.key === "ArrowRight" ? 1 : -1) * (rtl ? -1 : 1);
        const next = event.key === "Home" ? enabled[0] : event.key === "End" ? enabled.at(-1) : enabled[(current + direction + enabled.length) % enabled.length];
        if (next === undefined) return;
        onValueChange(options[next].value);
        buttons.current[next]?.focus();
      }}
    >{option.icon}<span>{option.label}</span></button>)}
  </div>;
}
