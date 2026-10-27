import { handleSecuritySettings } from "@/lib/security/settings-http";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleSecuritySettings(request); }
