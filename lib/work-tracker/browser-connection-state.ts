export type BrowserStatus = {
 protocol: number;
 state: "unconfigured" | "connected" | "invalid" | "unreachable" | "other-erp" | "update-required";
 connected: boolean;
 credentialId?: string;
 browserName?: string;
 enabled?: boolean;
 pendingCount?: number;
 lastSync?: string | null;
};
export function browserConnectionAction(status: BrowserStatus | null, owned: boolean) {
 if (!status || status.protocol !== 2) return "check";
 if (status.state === "connected") return owned ? "rename" : "blocked";
 if (status.state === "invalid" && status.enabled) return "blocked";
 if (["unconfigured", "invalid"].includes(status.state) && !status.pendingCount) return "connect";
 return "blocked";
}
