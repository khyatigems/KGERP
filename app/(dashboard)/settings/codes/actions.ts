"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import { PERMISSIONS } from "@/lib/permissions";
import { checkPermission } from "@/lib/permission-guard";
import { z } from "zod";

const codePattern = /^[A-Z0-9]{1,6}$/;

export type CodeGroup = "categories" | "gemstones" | "colors" | "cuts" | "collections" | "rashis" | "expenseCategories" | "certificates";

// Schema for other codes (CategoryCode, etc.)
const createCodeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().toUpperCase().regex(codePattern, "Code must be uppercase, alphanumeric, and up to 6 characters long"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

// Schema specifically for Expense Categories
const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().toUpperCase().regex(codePattern, "Code must be uppercase, alphanumeric, and up to 6 characters long").optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  gstAllowed: z.coerce.boolean().default(false),
});

// Schema specifically for Certificate Codes
const createCertificateSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  remarks: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const updateCodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  gstAllowed: z.coerce.boolean().optional(), // Only for expense categories
  remarks: z.string().optional(), // Only for certificates
});

export async function createCode(group: CodeGroup, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { error: perm.message };

  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const rawData = {
    name: formData.get("name"),
    code: formData.get("code"),
    status: formData.get("status") || "ACTIVE",
    gstAllowed: formData.get("gstAllowed") === "true",
    remarks: formData.get("remarks"),
  };

  let parsed;
  if (group === "expenseCategories") {
    parsed = createExpenseCategorySchema.safeParse(rawData);
  } else if (group === "certificates") {
    parsed = createCertificateSchema.safeParse(rawData);
  } else {
    parsed = createCodeSchema.safeParse(rawData);
  }

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // @ts-expect-error - handling different shapes from union schema
  const { name, code, status, gstAllowed, remarks } = parsed.data;

  // Check existence
  let existing;
  if (group === "categories") {
    existing = await prisma.categoryCode.findUnique({ where: { code: code! } });
  } else if (group === "gemstones") {
    existing = await prisma.gemstoneCode.findUnique({ where: { code: code! } });
  } else if (group === "colors") {
    existing = await prisma.colorCode.findUnique({ where: { code: code! } });
  } else if (group === "cuts") {
    existing = await prisma.cutCode.findUnique({ where: { code: code! } });
  } else if (group === "collections") {
    existing = await prisma.collectionCode.findUnique({ where: { code: code! } });
  } else if (group === "rashis") {
    existing = await prisma.rashiCode.findUnique({ where: { code: code! } });
  } else if (group === "expenseCategories") {
      // For expense categories, code is optional but must be unique if provided
      if (code) {
          existing = await prisma.expenseCategory.findUnique({ where: { code } });
      }
      // Also check name uniqueness for expense categories
      if (!existing) {
          const nameExists = await prisma.expenseCategory.findUnique({ where: { name } });
          if (nameExists) return { error: "NAME_ALREADY_EXISTS", message: "Category name already exists." };
      }
  } else if (group === "certificates") {
      // For certificates, we check name uniqueness primarily
      existing = await prisma.certificateCode.findUnique({ where: { name } });
  }

  if (existing) {
    return { error: "CODE_ALREADY_EXISTS", message: "This code/name already exists in the system. Duplicate entries are not allowed." };
  }

  try {
    let created;
    if (group === "categories") {
      created = await prisma.categoryCode.create({ data: { name, code: code!, status } });
    } else if (group === "gemstones") {
      created = await prisma.gemstoneCode.create({ data: { name, code: code!, status } });
    } else if (group === "colors") {
      created = await prisma.colorCode.create({ data: { name, code: code!, status } });
    } else if (group === "cuts") {
      created = await prisma.cutCode.create({ data: { name, code: code!, status } });
    } else if (group === "collections") {
      created = await prisma.collectionCode.create({ data: { name, code: code!, status } });
    } else if (group === "rashis") {
      created = await prisma.rashiCode.create({ data: { name, code: code!, status } });
    } else if (group === "expenseCategories") {
      created = await prisma.expenseCategory.create({ 
          data: { 
              name, 
              code: code || null, 
              status, 
              gstAllowed 
          } 
      });
    } else if (group === "certificates") {
      // Generate a code from name since user said "no need to add code"
      // Simple slug generation: uppercase, remove non-alphanumeric, take first 6 chars
      // Ensure it's unique by appending random chars if needed? 
      // For now, let's try simple generation. If collision, we might fail, but name is unique so collision is unlikely unless we truncate.
      let generatedCode = name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (generatedCode.length === 0) {
        generatedCode = "CERT" + Math.floor(Math.random() * 100);
      }
      
      // Check if generated code exists (edge case)
      const codeExists = await prisma.certificateCode.findUnique({ where: { code: generatedCode } });
      if (codeExists) {
         generatedCode = generatedCode.slice(0, 3) + Math.floor(Math.random() * 1000);
      }

      created = await prisma.certificateCode.create({ 
        data: { 
          name, 
          code: generatedCode, 
          status,
          remarks
        } 
      });
    } else {
        throw new Error("Invalid group");
    }

    await logActivity({
      entityType: "Code",
      entityId: created.id,
      entityIdentifier: `${group} ${created.code || created.name}`,
      actionType: "CREATE",
      newData: created,
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || undefined,
    });

    revalidatePath("/settings/codes");
    return { success: true, data: created };
  } catch (error) {
    console.error(error);
    return { error: "Failed to create code" };
  }
}

export async function updateCode(group: CodeGroup, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { error: perm.message };

  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const rawData = {
    id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
    gstAllowed: formData.get("gstAllowed"),
    remarks: formData.get("remarks"),
  };

  const parsed = updateCodeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, name, status, gstAllowed, remarks } = parsed.data;

  let existing;
  if (group === "categories") {
    existing = await prisma.categoryCode.findUnique({ where: { id } });
  } else if (group === "gemstones") {
    existing = await prisma.gemstoneCode.findUnique({ where: { id } });
  } else if (group === "colors") {
    existing = await prisma.colorCode.findUnique({ where: { id } });
  } else if (group === "cuts") {
    existing = await prisma.cutCode.findUnique({ where: { id } });
  } else if (group === "collections") {
    existing = await prisma.collectionCode.findUnique({ where: { id } });
  } else if (group === "rashis") {
    existing = await prisma.rashiCode.findUnique({ where: { id } });
  } else if (group === "expenseCategories") {
    existing = await prisma.expenseCategory.findUnique({ where: { id } });
  } else if (group === "certificates") {
    existing = await prisma.certificateCode.findUnique({ where: { id } });
  }

  if (!existing) return { error: "Code not found" };

  try {
    let updated;
    if (group === "categories") {
      updated = await prisma.categoryCode.update({ where: { id }, data: { name, status } });
    } else if (group === "gemstones") {
      updated = await prisma.gemstoneCode.update({ where: { id }, data: { name, status } });
    } else if (group === "colors") {
      updated = await prisma.colorCode.update({ where: { id }, data: { name, status } });
    } else if (group === "cuts") {
      updated = await prisma.cutCode.update({ where: { id }, data: { name, status } });
    } else if (group === "collections") {
      updated = await prisma.collectionCode.update({ where: { id }, data: { name, status } });
    } else if (group === "rashis") {
      updated = await prisma.rashiCode.update({ where: { id }, data: { name, status } });
    } else if (group === "expenseCategories") {
      updated = await prisma.expenseCategory.update({ 
          where: { id }, 
          data: { 
              name, 
              status,
              gstAllowed: gstAllowed // Update gstAllowed
          } 
      });
    } else if (group === "certificates") {
      updated = await prisma.certificateCode.update({ 
        where: { id }, 
        data: { 
          name, 
          status,
          remarks
        } 
      });
    }

    if (!updated) throw new Error("Failed to update code: Group not matched");

    await logActivity({
      entityType: "Code",
      entityId: updated.id,
      entityIdentifier: `${group} ${existing.code || existing.name}`,
      actionType: "EDIT",
      oldData: existing,
      newData: updated,
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || undefined,
    });

    revalidatePath("/settings/codes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to update code" };
  }
}

export async function deleteCode(group: CodeGroup, id: string) {
    const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
    if (!perm.success) return { error: perm.message };

    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    try {
        let existing;
        if (group === "expenseCategories") {
            existing = await prisma.expenseCategory.findUnique({ 
                where: { id },
                include: { _count: { select: { expenses: true } } }
            });

            if (!existing) return { error: "Category not found" };

            const expenseCount = existing._count.expenses;

            if (expenseCount > 0) {
                await prisma.expenseCategory.update({
                    where: { id },
                    data: { status: "INACTIVE" }
                });
                return { success: true, message: "Category has associated expenses. It has been marked as INACTIVE instead of deleted." };
            } else {
                await prisma.expenseCategory.delete({ where: { id } });
                return { success: true, message: "Category deleted successfully." };
            }
        } else if (group === "colors") {
             existing = await prisma.colorCode.findUnique({
                 where: { id },
                 include: { _count: { select: { inventories: true } } }
             });

             if (!existing) return { error: "Color code not found" };

             const inventoryCount = existing._count.inventories;

             if (inventoryCount > 0) {
                 await prisma.colorCode.update({
                     where: { id },
                     data: { status: "INACTIVE" }
                 });
                 return { success: true, message: "Color is used in inventory. It has been marked as INACTIVE." };
             } else {
                 await prisma.colorCode.delete({ where: { id } });
                 return { success: true, message: "Color code deleted successfully." };
             }
        }
        
        // For other codes, we can implement similar logic or keep it simple (not requested yet)
        return { error: "Deletion not implemented for this group yet" };

    } catch (error) {
        console.error(error);
        return { error: "Failed to delete code" };
    }
}

// CSV Import Logic
const csvRowSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().toUpperCase().regex(codePattern).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

type ImportError = {
  rowNumber: number;
  code: string;
  reason: string;
};

export async function importCodes(group: CodeGroup, rows: CsvRow[]) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { error: perm.message };

  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const results = {
    totalRows: rows.length,
    importedCount: 0,
    skippedDuplicatesCount: 0,
    invalidCount: 0,
    errors: [] as ImportError[],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = csvRowSchema.safeParse(row);

    if (!parsed.success) {
      results.invalidCount++;
      results.errors.push({
        rowNumber: i + 1,
        code: row.code || "UNKNOWN",
        reason: "Invalid format: " + parsed.error.issues.map(e => e.message).join(", "),
      });
      continue;
    }

    const { name, code, status } = parsed.data;

    if (group !== "expenseCategories" && !code) {
        results.invalidCount++;
        results.errors.push({
            rowNumber: i + 1,
            code: "MISSING",
            reason: "Code is required for this group"
        });
        continue;
    }

    let existing;
    if (group === "categories") {
      existing = await prisma.categoryCode.findUnique({ where: { code: code! } });
    } else if (group === "gemstones") {
      existing = await prisma.gemstoneCode.findUnique({ where: { code: code! } });
    } else if (group === "colors") {
      existing = await prisma.colorCode.findUnique({ where: { code: code! } });
    } else if (group === "cuts") {
      existing = await prisma.cutCode.findUnique({ where: { code: code! } });
    } else if (group === "collections") {
      existing = await prisma.collectionCode.findUnique({ where: { code: code! } });
    } else if (group === "rashis") {
      existing = await prisma.rashiCode.findUnique({ where: { code: code! } });
    } else if (group === "expenseCategories") {
        if (code) {
            existing = await prisma.expenseCategory.findUnique({ where: { code } });
        }
    }

    if (existing) {
      results.skippedDuplicatesCount++;
      continue;
    }

    try {
      if (group === "categories") {
        await prisma.categoryCode.create({ data: { name, code: code!, status } });
      } else if (group === "gemstones") {
        await prisma.gemstoneCode.create({ data: { name, code: code!, status } });
      } else if (group === "colors") {
        await prisma.colorCode.create({ data: { name, code: code!, status } });
      } else if (group === "cuts") {
        await prisma.cutCode.create({ data: { name, code: code!, status } });
      } else if (group === "collections") {
        await prisma.collectionCode.create({ data: { name, code: code!, status } });
      } else if (group === "rashis") {
        await prisma.rashiCode.create({ data: { name, code: code!, status } });
      } else if (group === "expenseCategories") {
        await prisma.expenseCategory.create({ data: { name, code: code || null, status } });
      }
      results.importedCount++;
    } catch {
      results.invalidCount++;
      results.errors.push({
        rowNumber: i + 1,
        code: code || "UNKNOWN",
        reason: "Database error",
      });
    }
  }

  if (results.importedCount > 0) {
    await logActivity({
      entityType: "Code",
      entityId: "batch-import",
      entityIdentifier: `${group} CSV Import`,
      actionType: "CREATE",
      newData: { imported: results.importedCount, skipped: results.skippedDuplicatesCount },
      source: "CSV_IMPORT",
      userId: session.user.id,
      userName: session.user.name || undefined,
    });
    revalidatePath("/settings/codes");
  }

  return { success: true, results };
}

export async function checkCodeDuplicate(group: CodeGroup, code: string) {
  const normalized = code.toUpperCase();

  if (group === "categories") {
    const existing = await prisma.categoryCode.findUnique({ where: { code: normalized } });
    return !!existing;
  }

  if (group === "gemstones") {
    const existing = await prisma.gemstoneCode.findUnique({ where: { code: normalized } });
    return !!existing;
  }

  if (group === "colors") {
    const existing = await prisma.colorCode.findUnique({ where: { code: normalized } });
    return !!existing;
  }

  if (group === "cuts") {
    const existing = await prisma.cutCode.findUnique({ where: { code: normalized } });
    return !!existing;
  }

  if (group === "collections") {
    const existing = await prisma.collectionCode.findUnique({ where: { code: normalized } });
    return !!existing;
  }

  if (group === "rashis") {
      const existing = await prisma.rashiCode.findUnique({ where: { code: normalized } });
      return !!existing;
  }

  if (group === "expenseCategories") {
      const existing = await prisma.expenseCategory.findUnique({ where: { code: normalized } });
      return !!existing;
  }

  return false;
}
