import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { SidebarGridClient } from "@/components/layout/sidebar-grid-client";
import { auth } from "@/lib/auth";
import { ensureRbacSchema, ensureUserRoleIdColumn, hasTable, hasUserRoleIdColumn, prisma, ensureAvatarWhatsNewSchema, ensurePasswordResetSchema, ensurePerformanceIndexes } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { getPermissionsForRole } from "@/lib/permissions";
import { SmartNotificationsProvider } from "@/components/ui/smart-notifications";

const SCHEMA_CACHE_TTL = 5 * 60 * 1000;
let schemaCache: { result: boolean; expiresAt: number } | null = null;
let rbacTablesCache: { hasRbac: boolean; expiresAt: number } | null = null;

async function ensureAllSchemasCached() {
  const now = Date.now();
  if (schemaCache && schemaCache.expiresAt > now) return;
  await Promise.all([
    ensureUserRoleIdColumn(),
    ensureAvatarWhatsNewSchema(),
    ensurePasswordResetSchema(),
    ensureRbacSchema(),
    ensureMarketplaceFoundationSchema(),
    ensurePerformanceIndexes(),
  ]);
  schemaCache = { result: true, expiresAt: now + SCHEMA_CACHE_TTL };
}

async function checkRbacTablesCached() {
  const now = Date.now();
  if (rbacTablesCache && rbacTablesCache.expiresAt > now) return rbacTablesCache.hasRbac;
  const [a, b, c, d] = await Promise.all([
    hasTable("UserPermission"),
    hasTable("Role"),
    hasTable("Permission"),
    hasTable("RolePermission"),
  ]);
  const hasRbac = a && b && c && d;
  rbacTablesCache = { hasRbac, expiresAt: now + SCHEMA_CACHE_TTL };
  return hasRbac;
}

type DashboardUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  avatarUrl?: string | null;
  avatarHistory?: string[];
  role?: string;
  lastLogin?: Date | string | null;
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  let user: DashboardUser | undefined = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: (session.user as any)?.image ?? (session.user as any)?.avatar ?? null,
        avatarUrl: (session.user as any)?.avatarUrl ?? null,
        role: session.user.role ?? undefined,
        lastLogin: session.user.lastLogin ?? null,
      }
    : undefined;
  let allowedNavModules: string[] = [];

  if (session?.user?.id) {
    await ensureAllSchemasCached();
    const supports = await hasUserRoleIdColumn();
    const hasRbacTables = await checkRbacTablesCached();

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
            avatarUrl: true,
            avatarHistory: true,
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

        if (!allowedNavModules.length && dbUser.role) {
          allowedNavModules = getPermissionsForRole(dbUser.role);
        }

        if (!allowedNavModules.length) {
          allowedNavModules = ["DASHBOARD_BASIC"];
        }
      }

      user = {
        name: dbUser.name ?? session?.user?.name ?? null,
        email: dbUser.email ?? session?.user?.email ?? null,
        image: dbUser.avatar ?? (session?.user as any)?.image ?? (session?.user as any)?.avatar ?? null,
        avatarUrl: dbUser.avatarUrl ?? (session?.user as any)?.avatarUrl ?? null,
        avatarHistory: (() => { try { return dbUser.avatarHistory ? JSON.parse(dbUser.avatarHistory) : []; } catch { return []; } })(),
        role: (dbUser.role ?? session?.user?.role) ?? undefined,
        lastLogin: dbUser.lastLogin ?? (session?.user as any)?.lastLogin ?? null,
      } as any;
    }
  }

  return (
    <SidebarProvider>
      <SmartNotificationsProvider>
        <SidebarGridClient>
          <div className="hidden border-r lg:block bg-sidebar border-sidebar-border premium-sidebar">
            <Sidebar allowedModules={allowedNavModules} />
          </div>
          <div className="flex flex-col">
            <Topbar user={user}
            />
            <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background sass-enter">
              {children}
            </main>
          </div>
        </SidebarGridClient>
      </SmartNotificationsProvider>
    </SidebarProvider>
  );
}
