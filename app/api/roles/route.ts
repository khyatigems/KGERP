import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { ensureRbacSchema, prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

type PermissionRow = {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
};

async function seedPermissionsAndRoles() {
  await ensureRbacSchema();

  const allKeys = Array.from(new Set(Object.values(PERMISSIONS)));

  const existing = await prisma.$queryRawUnsafe<Array<{ key: string }>>(`SELECT key FROM "Permission"`);
  const existingSet = new Set((existing || []).map((r) => r.key));

  for (const key of allKeys) {
    if (existingSet.has(key)) continue;
    const [module, action] = key.split(":");
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Permission" (id, module, action, key, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      crypto.randomUUID(),
      module,
      action,
      key
    );
  }

  const rolesToEnsure = [
    { name: "SUPER_ADMIN", isSystem: 1, isActive: 1 },
    { name: "ADMIN", isSystem: 1, isActive: 1 },
    { name: "SALES", isSystem: 1, isActive: 1 },
    { name: "ACCOUNTS", isSystem: 1, isActive: 1 },
    { name: "VIEWER", isSystem: 1, isActive: 1 },
  ];

  const roleRows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(`SELECT id, name FROM "Role"`);
  const roleByName = new Map((roleRows || []).map((r) => [r.name, r.id]));

  for (const role of rolesToEnsure) {
    if (roleByName.has(role.name)) continue;
    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Role" (id, name, isSystem, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      role.name,
      role.isSystem,
      role.isActive
    );
    roleByName.set(role.name, id);
  }

  const permissions = await prisma.$queryRawUnsafe<Array<{ id: string; key: string }>>(`SELECT id, key FROM "Permission"`);
  const permIds = new Map((permissions || []).map((p) => [p.key, p.id]));

  const fullAccessRoles = ["SUPER_ADMIN", "ADMIN"];
  for (const roleName of fullAccessRoles) {
    const roleId = roleByName.get(roleName);
    if (!roleId) continue;
    for (const key of allKeys) {
      const permissionId = permIds.get(key);
      if (!permissionId) continue;
      await prisma.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "RolePermission" (id, roleId, permissionId) VALUES (?, ?, ?)`,
        crypto.randomUUID(),
        roleId,
        permissionId
      );
    }
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await seedPermissionsAndRoles();

    const [roles, permissions] = await Promise.all([
      (prisma as any).role.findMany({
        include: { permissions: { include: { permission: true } } },
        orderBy: { name: "asc" }
      }),
      prisma.$queryRawUnsafe<PermissionRow[]>(
        `SELECT id, key, module, action, description FROM "Permission" ORDER BY module ASC, action ASC`
      )
    ]);

    return NextResponse.json({ roles, permissions });
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await seedPermissionsAndRoles();

    const body = (await request.json().catch(() => null)) as
      | { name?: string; duplicateFromRoleId?: string }
      | null;

    const name = String(body?.name || "").trim().toUpperCase();
    if (!name) return NextResponse.json({ error: "Role name is required" }, { status: 400 });

    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Role" (id, name, isSystem, isActive, createdAt, updatedAt)
       VALUES (?, ?, 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      id,
      name
    );

    const duplicateFrom = body?.duplicateFromRoleId ? String(body.duplicateFromRoleId) : null;
    if (duplicateFrom) {
      const rows = await prisma.$queryRawUnsafe<Array<{ permissionId: string }>>(
        `SELECT permissionId FROM "RolePermission" WHERE roleId = ?`,
        duplicateFrom
      );
      for (const r of rows || []) {
        if (!r?.permissionId) continue;
        await prisma.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "RolePermission" (id, roleId, permissionId) VALUES (?, ?, ?)`,
          crypto.randomUUID(),
          id,
          r.permissionId
        );
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Failed to create role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await seedPermissionsAndRoles();

    const body = (await request.json().catch(() => null)) as
      | { roleId?: string; permissionKeys?: string[]; isActive?: boolean }
      | null;

    const roleId = String(body?.roleId || "");
    const permissionKeys = Array.isArray(body?.permissionKeys) ? body!.permissionKeys : [];
    if (!roleId) return NextResponse.json({ error: "roleId is required" }, { status: 400 });

    const perms = await prisma.$queryRawUnsafe<Array<{ id: string; key: string }>>(
      `SELECT id, key FROM "Permission" WHERE key IN (${permissionKeys.map(() => "?").join(",") || "''"})`,
      ...(permissionKeys as unknown as string[])
    );
    const permIds = new Set((perms || []).map((p) => p.id));

    await prisma.$transaction(async (tx) => {
      if (typeof body?.isActive === "boolean") {
        await tx.$executeRawUnsafe(`UPDATE "Role" SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, body.isActive ? 1 : 0, roleId);
      } else {
        await tx.$executeRawUnsafe(`UPDATE "Role" SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, roleId);
      }

      await tx.$executeRawUnsafe(`DELETE FROM "RolePermission" WHERE roleId = ?`, roleId);
      for (const permissionId of permIds) {
        await tx.$executeRawUnsafe(
          `INSERT OR IGNORE INTO "RolePermission" (id, roleId, permissionId) VALUES (?, ?, ?)`,
          crypto.randomUUID(),
          roleId,
          permissionId
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
