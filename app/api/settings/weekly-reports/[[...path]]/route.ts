import { handleWeeklyReports } from "@/lib/weekly-report/http";
export const runtime = "nodejs";
export const maxDuration = 300;
type Context = { params: Promise<{ path?: string[] }> };
const handle = (request: Request, context: Context) => handleWeeklyReports(request, context);
export { handle as GET, handle as PUT, handle as POST };
