import { prisma } from "@/lib/prisma";
let ready: Promise<void> | undefined;
export function ensureNotesSchema() {
  return (ready ??= prisma
    .$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "NoteDetails" (
 "noteId" TEXT PRIMARY KEY NOT NULL,
 "title" TEXT NOT NULL DEFAULT '', "category" TEXT NOT NULL DEFAULT 'General',
 "tags" TEXT NOT NULL DEFAULT '', "kind" TEXT NOT NULL DEFAULT 'Note',
 "pinned" BOOLEAN NOT NULL DEFAULT false, "favorite" BOOLEAN NOT NULL DEFAULT false,
 "state" TEXT NOT NULL DEFAULT 'active', "uses" INTEGER NOT NULL DEFAULT 0,
 "shareToken" TEXT, "attachments" TEXT NOT NULL DEFAULT '[]')`,
    )
    .then(() => undefined)
    .catch((e) => {
      ready = undefined;
      throw e;
    }));
}
export type KnowledgeNote = {
  id: string;
  content: string;
  color: string;
  title: string;
  category: string;
  tags: string;
  kind: string;
  pinned: boolean;
  favorite: boolean;
  state: string;
  uses: number;
  shareToken: string | null;
  attachments: { name: string; type: string; data: string }[];
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string };
};
export async function listNotes(fullId?: string) {
  await ensureNotesSchema();
  const [notes, details] = await Promise.all([
    prisma.dashboardNote.findMany({
      where: fullId ? { id: fullId } : undefined,
      include: { createdBy: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT noteId,title,category,tags,kind,pinned,favorite,state,uses,shareToken,
 CASE WHEN noteId = ? THEN attachments ELSE '[]' END AS attachments FROM "NoteDetails"`,
      fullId ?? "",
    ),
  ]);
  const map = new Map(details.map((d) => [d.noteId, d]));
  return notes.map((n) => {
    const d = map.get(n.id);
    return {
      ...n,
      title: String(d?.title ?? ""),
      category: String(d?.category ?? "General"),
      tags: String(d?.tags ?? ""),
      kind: String(d?.kind ?? "Note"),
      pinned: Boolean(d?.pinned),
      favorite: Boolean(d?.favorite),
      state: String(d?.state ?? "active"),
      uses: Number(d?.uses ?? 0),
      shareToken: (d?.shareToken as string | null) ?? null,
      attachments: (
        JSON.parse(
          String(d?.attachments ?? "[]"),
        ) as KnowledgeNote["attachments"]
      ).map((a) => ({ ...a, data: n.id === fullId ? a.data : "" })),
    };
  });
}
