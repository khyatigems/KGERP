import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { GstGstr1View } from "@/components/reports/gst-gstr1-view";

export const dynamic = "force-dynamic";

export default async function GstReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");

  return <GstGstr1View />;
}

