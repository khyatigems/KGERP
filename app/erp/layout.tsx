import type { Metadata } from "next";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { SidebarGridClient } from "@/components/layout/sidebar-grid-client";
import { auth } from "@/lib/auth";
import { ensureRbacSchema, ensureUserRoleIdColumn, hasTable, hasUserRoleIdColumn, prisma, ensureAvatarWhatsNewSchema } from "@/lib/prisma";
import { Permission } from "@/lib/permissions";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default async function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Fetch fresh user data to ensure avatar is up-to-date
  let user = session?.user;
  let allowedNavModules: string[] = [];

  if (session?.user?.id) {
    await ensureUserRoleIdColumn();
    await ensureAvatarWhatsNewSchema();
    const supports = await hasUserRoleIdColumn();
    await ensureRbacSchema();
    const hasRbacTables = (await hasTable("UserPermission")) && (await hasTable("Role")) && (await hasTable("Permission")) && (await hasTable("RolePermission"));

    const dbUser = supports && hasRbacTables
      ? ((await (prisma.user as any).findUnique({
          where: { id: session.user.id },
          select: ({
            name: true,
            email: true,
            avatar: true,
            avatarUrl: true,
            avatarHistory: true,
            role: true,
            lastLogin: true,
            roleRelation: {
              select: { name: true, permissions: { select: { permission: { select: { key: true } } } } }
            },
            userPermissions: { select: { allow: true, permission: { select: { key: true } } } }
          } as any)
        })) as any)
      : ((await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            name: true,
            email: true,
            avatar: true,
            avatarUrl: true,
            avatarHistory: true,
            role: true,
            lastLogin: true,
          }
        })) as any);
    
    if (dbUser) {
      // Resolve permissions
      const resolvedPerms = new Set<string>();
      
      // Legacy static fallback for now
      if (dbUser.role === "SUPER_ADMIN" || dbUser.roleRelation?.name === "SUPER_ADMIN") {
        allowedNavModules = ["ALL"];
      } else {
        // From role
        dbUser.roleRelation?.permissions.forEach((rp: any) => resolvedPerms.add(rp.permission.key));

        if (!dbUser.roleRelation?.permissions?.length && dbUser.role) {
          try {
            const role = await (prisma).role.findUnique({
              where: { name: dbUser.role },
              include: { permissions: { include: { permission: true } } }
            });
            role?.permissions?.forEach((rp) => resolvedPerms.add(rp.permission.key));
          } catch {}
        }
        
        // Apply overrides
        dbUser.userPermissions?.forEach((up: any) => {
          if (up.allow) resolvedPerms.add(up.permission.key);
          else resolvedPerms.delete(up.permission.key);
        });

        allowedNavModules = Array.from(resolvedPerms);
      }

      user = {
        ...session.user,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.avatar,
        avatarUrl: dbUser.avatarUrl,
        avatarHistory: (() => { try { return dbUser.avatarHistory ? JSON.parse(dbUser.avatarHistory) : []; } catch { return []; } })(),
        role: dbUser.roleRelation?.name || dbUser.role,
        lastLogin: dbUser.lastLogin,
        permissions: allowedNavModules as Permission[]
      } as any;
    }
  }

  return (
    <SidebarProvider>
      <SidebarGridClient>
        <div className="hidden border-r lg:block bg-sidebar border-sidebar-border premium-sidebar">
          <Sidebar allowedModules={allowedNavModules} />
        </div>
        <div className="flex min-w-0 flex-col">
          <Topbar user={user} />
          <main className="erp-workspace flex min-w-0 flex-1 flex-col bg-background p-4 lg:p-6 sass-enter">
            <div className="workspace-body mx-auto w-full min-w-0 max-w-[1500px] space-y-5 pb-8">{children}</div>
          </main>
        </div>
      </SidebarGridClient>
    </SidebarProvider>
  );
}
