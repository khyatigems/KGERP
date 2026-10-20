import { handleTracker } from "@/lib/work-tracker/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
const handle = (request: Request, context: Context) => handleTracker(request, context);
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE, handle as PUT };
