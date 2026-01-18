"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "STAFF"]),
});

export async function createUser(formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { message: "Unauthorized" };
  }

  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
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
      },
    });
  } catch (e: any) {
    if (e.code === 'P2002') {
        return { message: "Email already exists" };
    }
    return { message: "Failed to create user" };
  }

  revalidatePath("/users");
  redirect("/users");
}

export async function deleteUser(id: string) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
        return { message: "Unauthorized" };
    }

    // Prevent deleting self
    if (session.user.id === id) {
        return { message: "Cannot delete yourself" };
    }

    try {
        await prisma.user.delete({ where: { id } });
        revalidatePath("/users");
        return { message: "User deleted" };
    } catch (e) {
        return { message: "Failed to delete user" };
    }
}
