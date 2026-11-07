"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import styles from "./reference-copy.module.css";

export function ReferenceCopy({ value, label = "Reference" }: { value: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <div className={styles.reference}>
    <span className={styles.label}>{label}</span><code>{value}</code>
    <button type="button" aria-label={`Copy ${label.toLowerCase()}: ${value}`} title={`Copy ${label.toLowerCase()}`} onClick={async () => {
      if (timer.current) clearTimeout(timer.current);
      try { await navigator.clipboard.writeText(value); setStatus("copied"); }
      catch { setStatus("failed"); }
      timer.current = setTimeout(() => setStatus("idle"), 2500);
    }}>{status === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}</button>
    <span role="status" aria-live="polite" className={styles.status}>{status === "copied" ? "Copied" : status === "failed" ? "Could not copy. Select the reference to copy it." : ""}</span>
  </div>;
}
