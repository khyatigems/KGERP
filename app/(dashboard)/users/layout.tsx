import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id || !(await checkUserPermission(session.user.id, PERMISSIONS.USERS_MANAGE))) redirect("/");
  return children;
}
