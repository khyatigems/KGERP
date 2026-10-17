import { NextRequest, NextResponse } from "next/server";
import { randomUUID, createHash } from "node:crypto";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { isSameRequestOrigin } from "@/lib/website/same-origin";
import { websiteDb, websiteEnabled } from "@/lib/website/editorial/database";
import { contentSchema } from "@/lib/website/editorial/contract";
import { editorialSql } from "@/lib/website/editorial/schema";
import registry from "@/lib/website/editorial/registry.json";
import firstDrafts from "@/lib/website/editorial/first-drafts.json";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const session = await auth();
  if (
    !websiteEnabled() ||
    !isSameRequestOrigin(req) ||
    !session?.user ||
    !(await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE))
  )
    return NextResponse.json({ error: "Unavailable" }, { status: 403 });
  try {
    const url = process.env.WEBSITE_DATABASE_URL || "";
    if (
      !url.startsWith("file:") &&
      new URL(url).hostname !==
        "khyati-website-content-kgadmin.aws-ap-south-1.turso.io"
    )
      throw new Error("Confirm the dedicated website database connection");
    if (/\b(DROP|ALTER|DELETE|UPDATE|TRUNCATE)\b/i.test(editorialSql))
      throw new Error("Schema must be additive");
    const tx = await websiteDb().transaction("write");
    let imported = 0;
    try {
      const now = new Date().toISOString(),
        checksum = createHash("sha256").update(editorialSql).digest("hex");
      const tables = await tx.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Website%'",
      );
      const backup: Record<string, unknown> = {};
      for (const r of tables.rows) {
        const name = String(r.name);
        if (!/^Website[A-Za-z0-9_]+$/.test(name))
          throw new Error("Unexpected table name");
        if (
          [
            "WebsiteEditorialBackup",
            "WebsiteRequestLimit",
            "WebsiteUploadGrant",
          ].includes(name)
        )
          continue;
        backup[name] = (await tx.execute(`SELECT * FROM "${name}"`)).rows;
      }
      for (const statement of editorialSql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.execute(statement);
      const previous = (
        await tx.execute({
          sql: "SELECT checksum FROM WebsiteEditorialMigration WHERE id=?",
          args: ["001-editorial"],
        })
      ).rows[0];
      if (previous && previous.checksum !== checksum)
        throw new Error(
          "Migration checksum differs. Use the documented migration process.",
        );
      if (!previous) {
        await tx.execute({
          sql: "INSERT INTO WebsiteEditorialBackup(id,payload,createdAt) VALUES(?,?,?)",
          args: [
            randomUUID(),
            JSON.stringify(backup, (_, v) =>
              typeof v === "bigint" ? String(v) : v,
            ),
            now,
          ],
        });
        await tx.execute({
          sql: "INSERT INTO WebsiteEditorialMigration(id,checksum) VALUES(?,?)",
          args: ["001-editorial", checksum],
        });
      }
      for (const entry of registry.entries) {
        const payload = contentSchema.parse({
          kind: /Traditional/.test(entry.coverageGroup)
            ? "glossary"
            : "gemstones",
          title: entry.proposedName,
          slug: entry.slug,
        });
        const result = await tx.execute({
          sql: "INSERT INTO WebsiteArticle(id,kind,slug,payload,stage,updatedAt) VALUES(?,?,?,?,'research',?) ON CONFLICT DO NOTHING",
          args: [
            entry.id,
            payload.kind,
            payload.slug,
            JSON.stringify(payload),
            now,
          ],
        });
        if (result.rowsAffected) {
          imported++;
          await tx.execute({
            sql: "INSERT INTO WebsiteArticleRevision(id,articleId,revision,payload,stage,action,actor,createdAt) VALUES(?,?,1,?,'research','registry-import',?,?)",
            args: [
              randomUUID(),
              entry.id,
              JSON.stringify(payload),
              session.user.id,
              now,
            ],
          });
        }
      }
      for (const entry of firstDrafts) {
        const existing = (
          await tx.execute({
            sql: "SELECT payload,stage,revision FROM WebsiteArticle WHERE id=?",
            args: [entry.id],
          })
        ).rows[0];
        if (
          !existing ||
          existing.stage !== "research" ||
          Number(existing.revision) !== 1 ||
          contentSchema.parse(JSON.parse(String(existing.payload))).summary
        )
          continue;
        const payload = contentSchema.parse(entry.content);
        const updated = await tx.execute({
          sql: "UPDATE WebsiteArticle SET payload=?,stage='draft',revision=2,updatedAt=? WHERE id=? AND revision=1 AND stage='research'",
          args: [JSON.stringify(payload), now, entry.id],
        });
        if (updated.rowsAffected) {
          await tx.execute({
            sql: "INSERT INTO WebsiteArticleRevision(id,articleId,revision,payload,stage,action,actor,createdAt) VALUES(?,?,2,?,'draft','research-draft-import','system:research-draft-import',?)",
            args: [randomUUID(), entry.id, JSON.stringify(payload), now],
          });
          await tx.execute({
            sql: "INSERT INTO WebsiteEditorialAudit(id,entityId,action,actor,payload,createdAt) VALUES(?,?,?,?,?,?)",
            args: [
              randomUUID(),
              entry.id,
              "draft-review-notes",
              session.user.id,
              JSON.stringify({ notes: entry.reviewNotes }),
              now,
            ],
          });
        }
      }
      await tx.commit();
      return NextResponse.json({ ok: true, imported });
    } catch (error) {
      await tx.rollback();
      throw error;
    } finally {
      tx.close();
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Setup could not complete. Check the dedicated website database and migration status.",
      },
      { status: 503 },
    );
  }
}
