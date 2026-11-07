"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRight, Clock3, X } from "lucide-react";
import { useActiveViewRead } from "./use-active-view-read";
import { KHYRA } from "@/lib/khyra/identity";
import type { KhyraSeverity } from "@/lib/khyra/types";
import type { FacetState } from "./facet";
import { OfficialCompanionAvatar } from "./official-avatar";

export function KhyraSpeechBubble({ title, message, state, severity = "informational", category, createdAt, count = 0, intro = false, side, align, style, onDismiss, onReview, onSnooze, readKey, onRead }: {
  title: ReactNode; message?: ReactNode; state: FacetState; severity?: KhyraSeverity; category?: string; createdAt?: string; count?: number; intro?: boolean;
  side: "above" | "below"; align: "start" | "end"; style: CSSProperties;
  readKey?: string; onRead?: () => void;
  onDismiss: () => void; onReview: () => void; onSnooze: () => void;
}) {
  const readRef = useActiveViewRead(readKey, !intro, onRead);
  const timestamp = createdAt && Number.isFinite(Date.parse(createdAt)) ? new Date(createdAt) : null;
  const compact = Number.parseFloat(String((style as CSSProperties & { "--bubble-max-height"?: string })["--bubble-max-height"] || 320)) < 260;
  return <aside ref={readRef} role="status" aria-live="polite" aria-atomic="true" style={style} className="facet-speech-bubble khyra-speech" data-companion-alert data-side={side} data-align={align} data-tone={severity} data-intro={intro ? "true" : "false"} data-density={compact ? "compact" : "comfortable"}>
    <div className="facet-speech-header">
      <div className="khyra-speaker-portrait" aria-hidden="true"><OfficialCompanionAvatar state={state} framing="portrait" displaySize={56} /></div>
      <div className="khyra-speaker-identity"><span className="facet-speech-speaker">{KHYRA.name}<span className="facet-speaking-dot" aria-hidden="true" /></span><span className="khyra-speaker-caption">Your KhyatiGems Companion</span></div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss companion alert" className="facet-speech-close"><X size={16} aria-hidden="true" /></button>
    </div>
    {!intro && <div className="khyra-speech-meta"><span>{category || "Business update"}</span>{timestamp && <time dateTime={createdAt}>{timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}</div>}
    <div className="khyra-speech-body" tabIndex={0} aria-label="Khyra message">
      <div className="facet-speech-title">{title}</div>
      {message && <div className="facet-speech-message">{message}</div>}
    </div>
    <div className="facet-speech-footer">
      <button type="button" className="facet-speech-action" onClick={onReview}>{intro ? "Show my tools" : "Review update"}<ArrowUpRight size={14} aria-hidden="true" /></button>
      <button type="button" className="khyra-snooze-action" aria-label="Snooze companion for 15 minutes" onClick={onSnooze}><Clock3 size={14} aria-hidden="true" />15 min</button>
      {count > 0 && <span className="facet-speech-count">+{count} more</span>}
    </div>
  </aside>;
}
