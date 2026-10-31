import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listNotes } from "@/lib/notes";
import { z } from "zod";
import { sendEmail } from "@/lib/email/email-service";
import { getFreezeBlockedResponse } from "@/lib/governance";
export async function POST(req: Request) {
  if (!(await auth())?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const frozen = await getFreezeBlockedResponse("Email note");
  if (frozen) return frozen;
  try {
    const { id, to } = z
      .object({ id: z.string(), to: z.email() })
      .parse(await req.json());
    const note = (await listNotes(id))[0];
    if (!note)
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    const result = await sendEmail({
      to,
      subject: `Khyati Gems — ${note.title || "Shared note"}`,
      text: note.title ? `${note.title}\n\n${note.content}` : note.content,
      emailType: "NOTE",
    });
    return NextResponse.json(result, { status: result.success ? 200 : 502 });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to send email. Check the recipient and email configuration.",
      },
      { status: 400 },
    );
  }
}
