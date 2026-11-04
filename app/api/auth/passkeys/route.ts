import { getPasskeys, postPasskeys } from "@/lib/security/passkey-http";
export const runtime = "nodejs";
export const GET = (request: Request) => getPasskeys(request);
export const POST = (request: Request) => postPasskeys(request);
