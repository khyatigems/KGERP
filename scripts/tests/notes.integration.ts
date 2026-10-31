import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
async function main() {
  const temp = mkdtempSync(path.join(tmpdir(), "kg-notes-"));
  process.env.DATABASE_URL = `file:${path.join(temp, "test.db").replaceAll("\\", "/")}`;
  process.env.TURSO_DATABASE_URL = "";
  process.env.TURSO_URL = "";
  const { prisma } = await import("@/lib/prisma");
  try {
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "User" (id TEXT PRIMARY KEY, name TEXT, email TEXT, password TEXT, role TEXT)`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "User" VALUES ('actor','Team member','notes@example.test','unused','ADMIN')`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "DashboardNote" (id TEXT PRIMARY KEY, content TEXT NOT NULL, color TEXT DEFAULT 'yellow', position INTEGER DEFAULT 0, createdById TEXT, createdAt DATETIME DEFAULT CURRENT_TIMESTAMP, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TABLE "Setting" (id TEXT PRIMARY KEY, key TEXT UNIQUE, value TEXT, description TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DashboardNote" (id,content,createdById) VALUES ('legacy','Original prompt\nRuby photography — हिन्दी 💎','actor')`,
    );
    const { listNotes, ensureNotesSchema } = await import("@/lib/notes");
    await Promise.all([ensureNotesSchema(), ensureNotesSchema()]);
    for (const sql of readFileSync(
      "prisma/migrations/20261031090000_notes_knowledge/migration.sql",
      "utf8",
    )
      .split(";")
      .filter((s) => s.trim()))
      await prisma.$executeRawUnsafe(sql);
    const { handleNotesGet, handleNotesWrite } = await import(
      "@/app/api/dashboard/notes/route"
    );
    const actor = async () => ({ user: { id: "actor" } });
    const request = (data: object, method = "PUT") =>
      new Request("http://erp.test/api/dashboard/notes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    assert.equal(
      (
        await handleNotesGet(
          new Request("http://erp.test/api/dashboard/notes"),
          async () => null,
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await handleNotesWrite(
          request({ content: "Denied" }, "POST"),
          async () => null,
        )
      ).status,
      401,
    );
    let notes = await listNotes();
    assert.equal(notes.length, 1);
    assert.equal(
      notes[0].content,
      "Original prompt\nRuby photography — हिन्दी 💎",
    );
    assert.equal(notes[0].state, "active");
    const created = await handleNotesWrite(
      request(
        {
          content: "Long reusable prompt",
          title: "Photography",
          kind: "Prompt",
          tags: "ruby, macro",
        },
        "POST",
      ),
      actor,
    );
    assert.equal(created.status, 200);
    const note = await created.json();
    assert.equal(note.createdById, "actor");
    let res = await handleNotesWrite(
      request({
        id: note.id,
        expectedUpdatedAt: note.updatedAt,
        pinned: true,
        favorite: true,
        category: "Photography",
        share: true,
        attachments: [
          {
            name: "test.txt",
            type: "text/plain",
            data: "data:text/plain;base64,aGVsbG8=",
          },
        ],
      }),
      actor,
    );
    assert.equal(res.status, 200);
    const edited = await res.json();
    assert.ok(edited.shareToken);
    assert.equal(edited.pinned, true);
    assert.equal(
      (
        await handleNotesWrite(
          request({
            id: note.id,
            expectedUpdatedAt: note.updatedAt,
            content: "Stale overwrite",
          }),
          actor,
        )
      ).status,
      409,
    );
    notes = await listNotes();
    assert.equal(
      notes.find((n) => n.id === note.id)?.attachments.length,
      0,
      "lists exclude attachment payloads",
    );
    assert.equal(
      (await listNotes(note.id)).find((n) => n.id === note.id)?.attachments[0]
        .data,
      "data:text/plain;base64,aGVsbG8=",
    );
    const { GET: share } = await import("@/app/api/notes/share/route");
    assert.equal(
      (
        await share(
          new Request(
            `http://erp.test/api/notes/share?token=${edited.shareToken}`,
          ),
        )
      ).status,
      200,
    );
    res = await handleNotesWrite(
      request({ id: note.id, state: "trash" }),
      actor,
    );
    assert.equal(res.status, 200);
    assert.equal(
      (
        await share(
          new Request(
            `http://erp.test/api/notes/share?token=${edited.shareToken}`,
          ),
        )
      ).status,
      404,
    );
    assert.equal(
      await prisma.dashboardNote.count(),
      2,
      "soft delete preserves original notes",
    );
    await handleNotesWrite(request({ id: note.id, state: "active" }), actor);
    assert.equal(
      (await listNotes()).find((n) => n.id === note.id)?.content,
      "Long reusable prompt",
      "restoration preserves content",
    );
    assert.equal(
      (
        await handleNotesWrite(
          request({ id: note.id, state: "INVALID" }),
          actor,
        )
      ).status,
      400,
    );
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Setting" (id,key,value) VALUES ('freeze','governance_freeze_mode','true')`,
    );
    assert.equal(
      (
        await handleNotesWrite(
          request({ id: note.id, content: "Blocked" }),
          actor,
        )
      ).status,
      423,
    );
    console.log(
      "Notes integration passed: legacy preservation, authentication, unified CRUD, conflict protection, attachments, sharing, soft-delete, restore and freeze guard.",
    );
  } finally {
    await prisma.$disconnect();
    rmSync(temp, { recursive: true, force: true });
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
