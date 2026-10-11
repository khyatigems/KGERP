import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { GstGstr1View } from "@/components/reports/gst-gstr1-view";
import { AnimatedPage } from "@/components/ui/animated-page";

export const dynamic = "force-dynamic";

export default async function GstReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VIEW))) redirect("/");

  return <AnimatedPage><GstGstr1View /></AnimatedPage>;
}

