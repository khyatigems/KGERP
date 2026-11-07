"use client";

import { useState } from "react";
import { companionPoses, companionPoseUsage, companionThinkingVideo, type CompanionPose } from "@/lib/companion-avatar";
import { OfficialCompanionAvatar } from "./official-avatar";
import { ThinkingClip } from "./thinking-clip";

export function CompanionPoseGallery({ motionEnabled = true, onPreview }: { motionEnabled?: boolean; onPreview?: (pose: CompanionPose) => void }) {
  const [selected, setSelected] = useState<CompanionPose>("idle");
  const [playVideo, setPlayVideo] = useState(false);
  const pose = companionPoses.find(item => item.id === selected);
  const shown = companionPoses.filter(item => ["idle", "working", "success", "concerned"].includes(item.id));
  return <section aria-label="Official companion pose library" className="space-y-3">
    <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Four essential poses</h3><span className="text-[10px] text-muted-foreground">Preview an event pose</span></div>
    <div data-pose-preview className="khyra-pose-preview">
      {playVideo ? <ThinkingClip active motionEnabled={motionEnabled} /> : <div className="size-24 shrink-0"><OfficialCompanionAvatar state="idle" pose={selected} preview displaySize={96} /></div>}
      <div className="min-w-0"><p role="status" className="text-xs font-semibold">Preview: {playVideo ? "Thinking animation" : pose?.label}</p><p className="mt-2 text-[11px] leading-4 text-muted-foreground">{playVideo ? "Plays during a real Workday check or your manual preview." : companionPoseUsage[selected]}</p><p className="mt-2 text-[10px] text-muted-foreground">Preview only. Events choose the live expression.</p></div>
    </div>
    <div className="khyra-pose-grid">{shown.map(item => <button key={item.id} type="button" aria-label={`Preview ${item.label}`} title={companionPoseUsage[item.id]} aria-pressed={!playVideo && selected === item.id} onClick={() => { setPlayVideo(false); setSelected(item.id); onPreview?.(item.id); }}><div className="khyra-pose-thumbnail"><OfficialCompanionAvatar state="idle" pose={item.id} displaySize={56} preview /></div><span className="mt-1 block">{item.label}</span></button>)}</div>
    {companionThinkingVideo && <button type="button" aria-pressed={playVideo} onClick={() => setPlayVideo(value => !value)} className="min-h-10 w-full rounded-xl border px-3 text-xs font-medium text-primary">{playVideo ? "Stop animation preview" : "Preview thinking animation"}</button>}
  </section>;
}
