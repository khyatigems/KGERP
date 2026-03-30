import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { auth } from "@/lib/auth";
import { ensureRbacSchema, ensureUserRoleIdColumn, hasTable, hasUserRoleIdColumn, prisma } from "@/lib/prisma";

type SessionType = Awaited<ReturnType<typeof auth>>;
type SessionUser = SessionType extends { user: infer U } ? U | null | undefined : undefined;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  let user: SessionUser = session?.user ?? null;
  let allowedNavModules: string[] = [];

  if (session?.user?.id) {
    await ensureUserRoleIdColumn();
    const supports = await hasUserRoleIdColumn();
    await ensureRbacSchema();
    const hasRbacTables =
      (await hasTable("UserPermission")) &&
      (await hasTable("Role")) &&
      (await hasTable("Permission")) &&
      (await hasTable("RolePermission"));

    const dbUser = supports && hasRbacTables
      ? ((await (prisma.user as any).findUnique({
          where: { id: session.user.id },
          select: ({
            name: true,
            email: true,
            avatar: true,
            role: true,
            lastLogin: true,
            roleRelation: {
              select: { name: true, permissions: { select: { permission: { select: { key: true } } } } },
            },
            userPermissions: { select: { allow: true, permission: { select: { key: true } } } },
          } as any),
        })) as any)
      : ((await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            name: true,
            email: true,
            avatar: true,
            role: true,
            lastLogin: true,
          },
        })) as any);

    if (dbUser) {
      const resolvedPerms = new Set<string>();

      const normalizeRole = (value: string | null | undefined) => value?.toUpperCase().replace(/\s+/g, "").replace(/_/g, "") ?? "";

      const isSuperAdmin = [
        normalizeRole(dbUser.role),
        normalizeRole(dbUser.roleRelation?.name),
        normalizeRole(session?.user?.role)
      ].some((role) => role === "SUPERADMIN");

      if (isSuperAdmin) {
        allowedNavModules = ["ALL"];
      } else {
        dbUser.roleRelation?.permissions?.forEach((rp: any) => resolvedPerms.add(rp.permission.key));

        if (!resolvedPerms.size && dbUser.role) {
          try {
            const role = await (prisma as any).role.findUnique({
              where: { name: dbUser.role },
              include: { permissions: { include: { permission: true } } },
            });
            role?.permissions?.forEach((rp: any) => resolvedPerms.add(rp.permission.key));
          } catch {}
        }

        dbUser.userPermissions?.forEach((up: any) => {
          if (up.allow) resolvedPerms.add(up.permission.key);
          else resolvedPerms.delete(up.permission.key);
        });

        allowedNavModules = Array.from(resolvedPerms);

        if (!allowedNavModules.length) {
          allowedNavModules = ["DASHBOARD_BASIC"];
        }
      }

      user = {
        ...(session?.user ?? {}),
        name: dbUser.name ?? session?.user?.name,
        email: dbUser.email ?? session?.user?.email,
        avatar: dbUser.avatar ?? (session?.user as any)?.avatar,
        image: dbUser.avatar ?? (session?.user as any)?.image,
        role: dbUser.role ?? session?.user?.role,
        lastLogin: dbUser.lastLogin ?? (session?.user as any)?.lastLogin,
      } as SessionUser;
    }
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[250px_1fr]">
      <div className="hidden border-r lg:block bg-sidebar border-sidebar-border">
        <Sidebar allowedModules={allowedNavModules} />
      </div>
      <div className="flex flex-col">
        <Topbar user={user} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
