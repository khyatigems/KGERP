import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getFreezeBlockedResponse } from "@/lib/governance";
import { ensureNotesSchema, listNotes } from "@/lib/notes";
const fields = z.object({
  title: z.string().max(300).optional(),
  content: z.string().max(200000).optional(),
  color: z.enum(["yellow", "blue", "green", "purple", "pink"]).optional(),
  position: z.number().int().optional(),
  category: z.string().max(100).optional(),
  tags: z.string().max(1000).optional(),
  kind: z
    .enum(["Note", "Prompt", "Template", "Documentation", "Checklist"])
    .optional(),
  pinned: z.boolean().optional(),
  favorite: z.boolean().optional(),
  state: z.enum(["active", "archived", "trash"]).optional(),
  share: z.boolean().optional(),
  used: z.boolean().optional(),
  expectedUpdatedAt: z.iso.datetime().optional(),
  attachments: z
    .array(
      z.object({
        name: z
          .string()
          .max(255)
          .regex(/\.(png|jpe?g|webp|gif|pdf|txt|docx|xlsx|csv)$/i),
        type: z.string().max(150),
        data: z
          .string()
          .max(3000000)
          .regex(/^data:[^;]*;base64,[A-Za-z0-9+/=]*$/),
      }),
    )
    .max(5)
    .optional(),
});
type Authenticate = () => Promise<{ user?: { id?: string } } | null>;
export async function handleNotesGet(req: Request, authenticate: Authenticate) {
  if (!(await authenticate())?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? undefined;
  try {
    const notes = await listNotes(id);
    return NextResponse.json(
      id ? (notes.find((n) => n.id === id) ?? null) : notes,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load notes" },
      { status: 500 },
    );
  }
}
export async function handleNotesWrite(
  req: Request,
  authenticate: Authenticate,
) {
  const session = await authenticate();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const frozen = await getFreezeBlockedResponse("Notes update");
  if (frozen) return frozen;
  try {
    await ensureNotesSchema();
    const body =
      req.method === "DELETE"
        ? { id: new URL(req.url).searchParams.get("id"), state: "trash" }
        : await req.json();
    const data = fields.parse(body);
    const creating = req.method === "POST";
    const id = creating
      ? crypto.randomUUID()
      : z.string().min(1).parse(body.id);
    const {
      content,
      color,
      position,
      share,
      used,
      attachments,
      expectedUpdatedAt,
      ...metadata
    } = data;
    await prisma.$transaction(async (tx) => {
      if (creating)
        await tx.dashboardNote.create({
          data: {
            id,
            content: content ?? "",
            color: color ?? "yellow",
            position: position ?? 0,
            createdById: userId,
          },
        });
      else {
        const result = await tx.dashboardNote.updateMany({
          where: {
            id,
            ...(expectedUpdatedAt
              ? { updatedAt: new Date(expectedUpdatedAt) }
              : {}),
          },
          data: { content, color, position, updatedAt: new Date() },
        });
        if (!result.count) throw new Error("CONFLICT");
      }
      await tx.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "NoteDetails" ("noteId") VALUES (?)`,
        id,
      );
      for (const [key, value] of Object.entries(metadata))
        await tx.$executeRawUnsafe(
          `UPDATE "NoteDetails" SET "${key}" = ? WHERE "noteId" = ?`,
          typeof value === "boolean" ? Number(value) : value,
          id,
        );
      if (attachments) {
        if (JSON.stringify(attachments).length > 3000000)
          throw new Error("Attachment limit");
        await tx.$executeRawUnsafe(
          `UPDATE "NoteDetails" SET "attachments" = ? WHERE "noteId" = ?`,
          JSON.stringify(attachments),
          id,
        );
      }
      if (share !== undefined)
        await tx.$executeRawUnsafe(
          `UPDATE "NoteDetails" SET "shareToken" = ? WHERE "noteId" = ?`,
          share ? crypto.randomUUID() : null,
          id,
        );
      if (used)
        await tx.$executeRawUnsafe(
          `UPDATE "NoteDetails" SET "uses" = "uses" + 1 WHERE "noteId" = ?`,
          id,
        );
      if (data.state === "trash")
        await tx.$executeRawUnsafe(
          `UPDATE "NoteDetails" SET "shareToken" = NULL WHERE "noteId" = ?`,
          id,
        );
    });
    return NextResponse.json((await listNotes(id)).find((n) => n.id === id));
  } catch (e) {
    const conflict = e instanceof Error && e.message === "CONFLICT";
    return NextResponse.json(
      {
        error: conflict
          ? "This note changed elsewhere. Copy your draft, then reopen the note to load the latest version."
          : e instanceof z.ZodError
            ? "Invalid note data"
            : "Unable to save note. Please retry.",
      },
      { status: conflict ? 409 : e instanceof z.ZodError ? 400 : 500 },
    );
  }
}
export const GET = (req: Request) => handleNotesGet(req, async () => auth());
export const POST = (req: Request) => handleNotesWrite(req, async () => auth());
export const PUT = POST;
export const DELETE = POST;
