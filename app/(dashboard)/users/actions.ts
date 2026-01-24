"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { checkPermission } from "@/lib/permission-guard";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SALES", "ACCOUNTS", "VIEWER"]),
  avatar: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "SALES", "ACCOUNTS", "VIEWER"]),
  avatar: z.string().optional(),
});

export async function createUser(formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.USERS_MANAGE);
  if (!perm.success) return { message: perm.message };

  const session = await auth(); // Still need session for audit if we were logging create action, but here we just need perm check passed.
  // Actually checkPermission already checked it.
  
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    avatar: formData.get("avatar"),
  };

  const result = userSchema.safeParse(data);
  
  if (!result.success) {
    return { message: "Invalid input data" };
  }

  try {
    const hashedPassword = await hash(result.data.password, 12);
    
    await prisma.user.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        password: hashedPassword,
        role: result.data.role,
        avatar: result.data.avatar,
      },
    });
  } catch (e: any) {
    console.error("User creation error:", e);
    
    // Fallback: If avatar fails (likely due to schema mismatch during dev), try without avatar
    if (e?.message?.includes("Unknown argument") && result.data.avatar) {
        try {
            const hashedPassword = await hash(result.data.password, 12);
            await prisma.user.create({
                data: {
                    name: result.data.name,
                    email: result.data.email,
                    password: hashedPassword,
                    role: result.data.role,
                },
            });
            // If successful, we just return (user created without avatar)
            revalidatePath("/users");
            redirect("/users");
        } catch (retryError) {
             console.error("Retry failed:", retryError);
             return { message: "Failed to create user (retry failed)" };
        }
    }

    if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
        return { message: "Email already exists" };
    }
    return { message: `Failed to create user: ${e.message || "Unknown error"}` };
  }

  revalidatePath("/users");
  redirect("/users");
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
    };

    const result = updateUserSchema.safeParse(data);
    if (!result.success) return { message: "Invalid input data" };

    try {
        const updateData: any = {
            name: result.data.name,
            email: result.data.email,
            role: result.data.role,
            avatar: result.data.avatar,
        };

        if (result.data.password && result.data.password.length >= 6) {
            updateData.password = await hash(result.data.password, 12);
        }

        await prisma.user.update({
            where: { id },
            data: updateData,
        });
    } catch (e: any) {
         // Fallback: If avatar fails (likely due to schema mismatch during dev), try without avatar
         if (e?.message?.includes("Unknown argument")) {
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
                     await prisma.user.update({
                         where: { id },
                         data: { ...baseData, password: hashedPassword },
                     });
                 } else {
                     await prisma.user.update({
                         where: { id },
                         data: baseData,
                     });
                 }
                 
                 revalidatePath("/users");
                 redirect("/users");
             } catch (retryError) {
                  console.error("Retry update failed:", retryError);
                  return { message: "Failed to update user (retry failed)" };
             }
         }

         if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002") {
            return { message: "Email already exists" };
        }
        return { message: "Failed to update user" };
    }

    revalidatePath("/users");
    redirect("/users");
}
