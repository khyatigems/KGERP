import manifest from "@/public/companion/khyati/manifest.json";
export const officialCompanionAssetsReady = manifest.ready;
export const companionExpressions = ["idle", "greeting", "speaking", "thinking", "happy", "success", "concerned", "alert", "working", "rest"] as const;
export type CompanionExpression = typeof companionExpressions[number];
export const companionPoseIds = [...companionExpressions, "greeting-soft", "concerned-full", "rest-lounge", "happy-full", "speaking-full", "idle-full", "ready-full", "thinking-full", "wave-full", "welcome", "welcome-alt", "celebrating"] as const;
export type CompanionPose = typeof companionPoseIds[number];
export type CompanionFraming = "portrait" | "full-body" | "adaptive";
export type CompanionPoseContext = { eventId?: string; module?: string; section?: string; storyKey?: string };
export const companionPoses = manifest.poses as Array<{ id: CompanionPose; label: string; framing: CompanionFraming }>;
export const companionThinkingVideo = manifest.thinkingVideo;
export function companionEventExpression(type?: string): "success" | "alert" | "concerned" | "working" | "speaking" {
  return type === "success" ? "success" : type === "error" ? "alert" : type === "warning" ? "concerned" : type === "loading" ? "working" : "speaking";
}
export function companionExpression(state: string): CompanionExpression {
  if (["sleeping", "resting", "rest"].includes(state)) return "rest";
  if (state === "warning") return "concerned";
  if (state === "notification") return "speaking";
  if (state === "wink") return "greeting";
  return companionExpressions.includes(state as CompanionExpression) ? state as CompanionExpression : "idle";
}
export function companionPoseForState(state: string, framing: CompanionFraming = "portrait", _context: CompanionPoseContext = {}): CompanionPose {
  if (framing === "adaptive") {
    return ["alert", "warning", "concerned"].includes(state) ? "concerned" : ["happy", "success", "celebrating"].includes(state) ? "success" : ["working", "thinking"].includes(state) ? "working" : "idle";
  }
  const full = framing === "full-body";
  if (state === "ready") return full ? "ready-full" : "welcome-alt";
  if (state === "welcome") return full ? "wave-full" : "welcome";
  if (["wink", "wave", "greeting-soft"].includes(state)) return full ? "wave-full" : "greeting-soft";
  if (state === "celebrating") return full ? "celebrating" : "success";
  const expression = companionExpression(state);
  if (!full) return expression;
  return ({ idle: "idle-full", greeting: "wave-full", speaking: "speaking-full", thinking: "thinking-full", happy: "happy-full", success: "celebrating", concerned: "concerned-full", alert: "concerned-full", working: "working", rest: "rest-lounge" } as const)[expression];
}
export const companionPoseUsage: Record<CompanionPose, string> = {
  idle: "A quiet moment in the workspace", greeting: "Welcoming you back", "greeting-soft": "Morning and gentle greetings",
  alert: "An important issue needs attention", concerned: "A record needs a closer look", happy: "A positive acknowledgement", success: "A verified operation is complete",
  "concerned-full": "Marketplace or integration issues", "rest-lounge": "Manual Rest and quiet hours", rest: "A peaceful inactive moment", "happy-full": "Celebrating confirmed everyday work",
  speaking: "Explaining an inventory or business update", "speaking-full": "Explaining orders, reports or marketplace updates", "idle-full": "Standing by in marketplace and work tracking", "ready-full": "Your tools are open and ready",
  thinking: "A request is being checked", "thinking-full": "Workday and marketplace processing", "wave-full": "A personal greeting when you interact", working: "A real operation is in progress",
  welcome: "Khyra's first introduction", "welcome-alt": "Offering help and daily review", celebrating: "A confirmed sale, payment or order success",
};
export function companionAvatarPath(expression: CompanionPose, size: 128 | 256 | 512 = 256) {
  return `/companion/khyati/${expression}-${size}.webp`;
}
