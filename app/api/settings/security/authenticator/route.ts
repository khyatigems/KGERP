import { handleAuthenticatorSettings } from "@/lib/security/authenticator-http";
export const runtime = "nodejs";
export async function POST(request: Request) { return handleAuthenticatorSettings(request); }
