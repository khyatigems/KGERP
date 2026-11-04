import { getAppLock, postAppLock } from "@/lib/security/app-lock-http";
export const runtime = "nodejs";
export const GET = (request: Request) => getAppLock(request);
export const POST = (request: Request) => postAppLock(request);
