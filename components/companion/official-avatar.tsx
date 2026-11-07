"use client";
import { KHYRA } from "@/lib/khyra/identity";
import { useState } from "react";
import { companionAvatarPath, companionPoseForState, type CompanionFraming, type CompanionPose, type CompanionPoseContext } from "@/lib/companion-avatar";
/** Static-first renderer. An expression failure falls back to the same character’s master. */
export function OfficialCompanionAvatar({ state, framing = "portrait", pose, context, preview = false, displaySize }: { state: string; framing?: CompanionFraming; pose?: CompanionPose; context?: CompanionPoseContext; preview?: boolean; displaySize?: number }) {
  const expression = pose || companionPoseForState(state, framing, context);
  const [failed, setFailed] = useState<string[]>([]);
  const shown = failed.includes(expression) ? "idle" : expression;
  if (failed.includes("idle")) return <span role="img" aria-label={`${KHYRA.name} image unavailable`} className="flex size-full items-center justify-center rounded-full border border-amber-600/30 bg-purple-100 p-2 text-center text-[10px] text-purple-950">KhyatiGems</span>;
  // Native image keeps decorative character motion independent of the application’s focus.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="facet-art facet-official-art" data-state={state} data-pose={shown} src={companionAvatarPath(shown)} srcSet={`${companionAvatarPath(shown,128)} 128w, ${companionAvatarPath(shown,256)} 256w, ${companionAvatarPath(shown,512)} 512w`} sizes={`${displaySize || (preview ? 240 : 144)}px`} width={512} height={512} alt="" aria-hidden="true" loading={preview ? "lazy" : "eager"} decoding="async" draggable={false} onError={() => setFailed(current => current.includes(shown) ? current : [...current, shown])} />;
}
