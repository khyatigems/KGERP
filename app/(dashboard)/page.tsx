import { DashboardView } from "@/components/dashboard/dashboard-view";
import { auth } from "@/lib/auth";
import { AnimatedPage } from "@/components/ui/animated-page";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const full = session?.user?.name || session?.user?.email || null;
  const firstName = full ? String(full).split(" ")[0] : null;

  return <AnimatedPage><DashboardView name={firstName} /></AnimatedPage>;
}
