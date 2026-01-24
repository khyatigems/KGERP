"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity-logger";
import { PERMISSIONS } from "@/lib/permissions";
import { checkPermission } from "@/lib/permission-guard";
import { z } from "zod";

const codePattern = /^[A-Z0-9]{1,6}$/;

const createCodeSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().toUpperCase().regex(codePattern, "Code must be uppercase, alphanumeric, and up to 6 characters long"),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

const updateCodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

type CodeGroup = "categories" | "gemstones" | "colors" | "cuts" | "collections" | "rashis";

// ... (imports)

export async function createCode(group: CodeGroup, formData: FormData) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { error: perm.message };

  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const rawData = {
    name: formData.get("name"),
    code: formData.get("code"),
    status: formData.get("status") || "ACTIVE",
  };

  const parsed = createCodeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { name, code, status } = parsed.data;

  let existing;
  if (group === "categories") {
    existing = await prisma.categoryCode.findUnique({ where: { code } });
  } else if (group === "gemstones") {
    existing = await prisma.gemstoneCode.findUnique({ where: { code } });
  } else if (group === "colors") {
    existing = await prisma.colorCode.findUnique({ where: { code } });
  } else if (group === "cuts") {
    existing = await prisma.cutCode.findUnique({ where: { code } });
  } else if (group === "collections") {
    existing = await prisma.collectionCode.findUnique({ where: { code } });
  } else {
    existing = await prisma.rashiCode.findUnique({ where: { code } });
  }
  if (existing) {
    return { error: "CODE_ALREADY_EXISTS", message: "This code already exists in the system. Duplicate codes are not allowed." };
  }

  try {
    let created;
    if (group === "categories") {
      created = await prisma.categoryCode.create({
        data: { name, code, status },
      });
    } else if (group === "gemstones") {
      created = await prisma.gemstoneCode.create({
        data: { name, code, status },
      });
    } else if (group === "colors") {
      created = await prisma.colorCode.create({
        data: { name, code, status },
      });
    } else if (group === "cuts") {
      created = await prisma.cutCode.create({
        data: { name, code, status },
      });
    } else if (group === "collections") {
      created = await prisma.collectionCode.create({
        data: { name, code, status },
      });
    } else {
      created = await prisma.rashiCode.create({
        data: { name, code, status },
      });
    }

    await logActivity({
      entityType: "Code",
      entityId: created.id,
      entityIdentifier: `${group} ${created.code}`,
      actionType: "CREATE",
      newData: created,
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || undefined,
    });

    revalidatePath("/settings/codes");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to create code" };
  }
}

export async function updateCode(group: CodeGroup, formData: FormData) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

  const rawData = {
    id: formData.get("id"),
    name: formData.get("name"),
    status: formData.get("status"),
  };

  const parsed = updateCodeSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { id, name, status } = parsed.data;

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
  } else {
    existing = await prisma.rashiCode.findUnique({ where: { id } });
  }
  if (!existing) return { error: "Code not found" };

  try {
    let updated;
    if (group === "categories") {
      updated = await prisma.categoryCode.update({
        where: { id },
        data: { name, status }, // Code is immutable, not included
      });
    } else if (group === "gemstones") {
      updated = await prisma.gemstoneCode.update({
        where: { id },
        data: { name, status }, // Code is immutable, not included
      });
    } else if (group === "colors") {
      updated = await prisma.colorCode.update({
        where: { id },
        data: { name, status }, // Code is immutable, not included
      });
    } else if (group === "cuts") {
      updated = await prisma.cutCode.update({
        where: { id },
        data: { name, status }, // Code is immutable, not included
      });
    } else if (group === "collections") {
      updated = await prisma.collectionCode.update({
        where: { id },
        data: { name, status }, // Code is immutable, not included
      });
    } else {
      updated = await prisma.rashiCode.update({
        where: { id },
        data: { name, status }, // Code is immutable, not included
      });
    }

    await logActivity({
      entityType: "Code",
      entityId: updated.id,
      entityIdentifier: `${group} ${existing.code}`,
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

// CSV Import Logic
const csvRowSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().toUpperCase().regex(codePattern),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

type ImportError = {
  rowNumber: number;
  code: string;
  reason: string;
};

export async function importCodes(group: CodeGroup, rows: CsvRow[]) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

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

    let existing;
    if (group === "categories") {
      existing = await prisma.categoryCode.findUnique({ where: { code } });
    } else if (group === "gemstones") {
      existing = await prisma.gemstoneCode.findUnique({ where: { code } });
    } else if (group === "colors") {
      existing = await prisma.colorCode.findUnique({ where: { code } });
    } else if (group === "cuts") {
      existing = await prisma.cutCode.findUnique({ where: { code } });
    } else if (group === "collections") {
      existing = await prisma.collectionCode.findUnique({ where: { code } });
    } else {
      existing = await prisma.rashiCode.findUnique({ where: { code } });
    }

    if (existing) {
      results.skippedDuplicatesCount++;
      // Optional: log or track skipped
      continue;
    }

    try {
      if (group === "categories") {
        await prisma.categoryCode.create({
          data: { name, code, status },
        });
      } else if (group === "gemstones") {
        await prisma.gemstoneCode.create({
          data: { name, code, status },
        });
      } else if (group === "colors") {
        await prisma.colorCode.create({
          data: { name, code, status },
        });
      } else if (group === "cuts") {
        await prisma.cutCode.create({
          data: { name, code, status },
        });
      } else if (group === "collections") {
        await prisma.collectionCode.create({
          data: { name, code, status },
        });
      } else {
        await prisma.rashiCode.create({
          data: { name, code, status },
        });
      }
      results.importedCount++;
    } catch {
      results.invalidCount++;
      results.errors.push({
        rowNumber: i + 1,
        code,
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

  const existing = await prisma.rashiCode.findUnique({ where: { code: normalized } });
  return !!existing;
}
