import { DashboardSwitcher } from "@/components/dashboard/dashboard-switcher";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTradingDashboard } from "@/lib/trading-dashboard";
import { auth } from "@/lib/auth";
import { AnimatedPage } from "@/components/ui/animated-page";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const initialView = (await cookies()).get("kg-dashboard-view")?.value === "classic" ? "classic" : "trading";
  let initialData;
  if (initialView === "trading") {
    try { initialData = await getTradingDashboard(session.user.id); } catch (error) { console.error("Dashboard initial load failed", error); }
  }
  const full = session?.user?.name || session?.user?.email || null;
  const firstName = full ? String(full).split(" ")[0] : null;

  return <AnimatedPage><DashboardSwitcher name={firstName} userId={session.user.id} initialView={initialView} initialData={initialData}/></AnimatedPage>;
}
