import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
export default async function AccessLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !(await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VENDOR))) redirect("/reports");
  return children;
}
