import { auth } from "@/lib/auth";
import { checkUserPermission, type Permission } from "@/lib/permissions";
import { redirect } from "next/navigation";

export async function requirePagePermission(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!await checkUserPermission(session.user.id, permission)) redirect("/403");
  return session;
}
