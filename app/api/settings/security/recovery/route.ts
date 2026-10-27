import { handleRecoveryCodes } from "@/lib/security/recovery-http";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleRecoveryCodes(request); }
