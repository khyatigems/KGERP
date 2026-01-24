import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const NoteSchema = z.object({
  content: z.string().min(1),
  color: z.string().default("yellow"),
  position: z.number().default(0),
});

export async function GET() {
  try {
      const notes = await prisma.dashboardNote.findMany({
          orderBy: { position: 'asc' },
          include: { createdBy: { select: { name: true } } }
      });
      return NextResponse.json(notes);
  } catch (error) {
      console.error("Notes fetch error:", error);
      // Return empty array on error to prevent client-side mapping errors
      return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { content, color, position } = NoteSchema.parse(body);

        // Fallback to first user for now since we don't have session passed easily here
        // In production, use auth() from next-auth
        let user;
        try {
            user = await prisma.user.findFirst();
        } catch (dbError) {
            console.error("Database error finding user:", dbError);
            // Don't throw yet, try to create default
        }
        
        // If no user exists (e.g. fresh install), create a default system user to allow notes to work
        if (!user) {
            console.log("No user found for note creation. Attempting to create/find default System Admin.");
            try {
                // Use upsert to handle potential race conditions or existing email
                user = await prisma.user.upsert({
                    where: { email: "admin@system.local" },
                    update: {}, // No update if exists
                    create: {
                        name: "System Admin",
                        email: "admin@system.local",
                        password: "system_generated", // Placeholder
                        role: "SUPER_ADMIN"
                    }
                });
            } catch (createError) {
                console.error("Failed to create default user:", createError);
                throw new Error("No user found and failed to create default user");
            }
        }

        const note = await prisma.dashboardNote.create({
            data: {
                content,
                color,
                position,
                createdById: user.id
            },
            include: { createdBy: { select: { name: true } } }
        });
        return NextResponse.json(note);
    } catch (error) {
        console.error("Notes create error:", error);
        return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, content, color } = z.object({
            id: z.string(),
            content: z.string().optional(),
            color: z.string().optional(),
        }).parse(body);

        const note = await prisma.dashboardNote.update({
            where: { id },
            data: {
                ...(content && { content }),
                ...(color && { color }),
            }
        });
        return NextResponse.json(note);
    } catch (error) {
        console.error("Notes update error:", error);
        return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) throw new Error("ID required");

        await prisma.dashboardNote.delete({
            where: { id }
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Notes delete error:", error);
        return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
    }
}
