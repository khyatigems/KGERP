"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { checkPermission } from "@/lib/permission-guard";
import { isProtectedRole } from "@/lib/permission-display";


const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().trim().min(1).max(60),
  avatar: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().optional(),
  role: z.string().trim().min(1).max(60),
  avatar: z.string().optional(),
  avatarUrl: z.string().optional(),
});

export async function createUser(formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.USERS_MANAGE);
  if (!perm.success) return { message: perm.message };

  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    avatar: formData.get("avatar"),
    avatarUrl: formData.get("avatarUrl") || undefined,
  };

  const result = userSchema.safeParse(data);

  if (!result.success) {
    return { message: "Invalid input data" };
  }

  // Try to find matching Role ID in the new DB table
  const roleRecord = await (prisma).role.findUnique({
    where: { name: result.data.role }
  });

  if (!roleRecord?.isActive) return { message: "Choose an active role" };
  const session = await auth();
  if (isProtectedRole(roleRecord.name) && session?.user?.role !== "SUPER_ADMIN") return { message: "Only superadmin can assign this role" };

  try {
    const hashedPassword = await hash(result.data.password, 12);

    const userData: unknown = {
      name: result.data.name,
      email: result.data.email,
      password: hashedPassword,
      role: result.data.role,
      roleId: roleRecord?.id,
      avatar: result.data.avatar,
    };
    if (result.data.avatarUrl) userData.avatarUrl = result.data.avatarUrl;

    await (prisma.user).create({
      data: userData,
    });
  } catch (e: unknown) {
    console.error("User creation error:", e);
    const message = e instanceof Error ? e.message : "";
    const code = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;

    if (message.includes("Unknown argument") && result.data.avatar) {
        try {
            const hashedPassword = await hash(result.data.password, 12);
            await (prisma.user).create({
                data: {
                    name: result.data.name,
                    email: result.data.email,
                    password: hashedPassword,
                    role: result.data.role,
                    roleId: roleRecord.id,
                },
            });
            // If successful, we just return (user created without avatar)
            revalidatePath("/users");
            return { success: true };
        } catch (retryError) {
             console.error("Retry failed:", retryError);
             return { message: "Failed to create user (retry failed)" };
        }
    }

    if (code === "P2002") {
        return { message: "Email already exists" };
    }
    return { message: `Failed to create user: ${message || "Unknown error"}` };
  }

  revalidatePath("/users");
  return { success: true };
}

export async function deleteUser(id: string) {
    const perm = await checkPermission(PERMISSIONS.USERS_MANAGE);
    if (!perm.success) return { message: perm.message };

    const session = await auth();
    if (!session?.user) return { message: "Unauthorized" };

    // Prevent deleting self
    if (session.user.id === id) {
        return { message: "Cannot delete yourself" };
    }

    const target = await prisma.user.findUnique({ where: { id }, include: { roleRelation: true } });
    if (isProtectedRole(target?.roleRelation?.name || target?.role)) return { message: "Superadmin accounts cannot be deleted" };

    try {
        await prisma.user.delete({ where: { id } });
        revalidatePath("/users");
        return { message: "User deleted" };
    } catch {
        return { message: "Failed to delete user" };
    }
}

export async function updateUser(id: string, formData: FormData) {
    const perm = await checkPermission(PERMISSIONS.USERS_MANAGE);
    if (!perm.success) return { message: perm.message };

    const data = {
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password") || undefined,
        role: formData.get("role"),
        avatar: formData.get("avatar"),
        avatarUrl: formData.get("avatarUrl") || undefined,
    };

    const result = updateUserSchema.safeParse(data);
    if (!result.success) return { message: "Invalid input data" };

    if (typeof data.password === "string" && data.password.length > 0 && data.password.length < 6) {
      return { message: "Password must be at least 6 characters" };
    }

    try {
        const roleRecord = await (prisma).role.findUnique({
          where: { name: result.data.role }
        });

        if (!roleRecord?.isActive) return { message: "Choose an active role" };
        const existingUser = await prisma.user.findUnique({ where: { id }, include: { roleRelation: true } });
        const session = await auth();
        if (isProtectedRole(existingUser?.roleRelation?.name || existingUser?.role) && session?.user?.role !== "SUPER_ADMIN") return { message: "Only superadmin can edit this account" };
        if (isProtectedRole(existingUser?.roleRelation?.name || existingUser?.role) && result.data.role !== (existingUser?.roleRelation?.name || existingUser?.role)) return { message: "Superadmin role cannot be changed" };
        if (isProtectedRole(roleRecord.name) && session?.user?.role !== "SUPER_ADMIN") return { message: "Only superadmin can assign this role" };
        const updateData: unknown = {
            name: result.data.name,
            email: result.data.email,
            role: result.data.role,
            roleRelation: roleRecord ? { connect: { id: roleRecord.id } } : undefined,
            avatar: result.data.avatar,
        };
        if (result.data.avatarUrl) updateData.avatarUrl = result.data.avatarUrl;

        if (result.data.password && result.data.password.length >= 6) {
            updateData.password = await hash(result.data.password, 12);
        }

        await (prisma.user).update({
            where: { id },
            data: updateData,
        });
    } catch (e: unknown) {
         const message = e instanceof Error ? e.message : "";
         const code = typeof e === "object" && e && "code" in e ? (e as { code?: unknown }).code : undefined;

         if (message.includes("Unknown argument")) {
             try {
                 const baseData = {
                    name: result.data.name,
                    email: result.data.email,
                    role: result.data.role,
                 };
                 // Add password if present
                 if (result.data.password && result.data.password.length >= 6) {
                     // We need to re-hash or assume we can't reuse updateData scope easily
                     // Ideally we lift updateData out of try block but 'const' block scope issues.
                     // Simpler to just re-construct.
                     const hashedPassword = await hash(result.data.password, 12);
                     await (prisma.user).update({
                         where: { id },
                         data: { ...baseData, password: hashedPassword },
                     });
                 } else {
                     await (prisma.user).update({
                         where: { id },
                         data: baseData,
                     });
                 }
                 
                 revalidatePath("/users");
                 return { success: true };
             } catch (retryError) {
                  console.error("Retry update failed:", retryError);
                  return { message: "Failed to update user (retry failed)" };
             }
         }

         if (code === "P2002") {
            return { message: "Email already exists" };
        }
        return { message: "Failed to update user" };
    }

    revalidatePath("/users");
    return { success: true };
}
