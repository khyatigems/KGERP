import { z } from "zod";
import { websiteDb } from "./database";
export const followupSchema = z
  .object({
    owner: z.string().trim().max(120),
    notes: z.string().trim().max(6000),
    nextContact: z.union([z.literal(""), z.string().date()]),
    revision: z.number().int().nonnegative(),
  })
  .strict();
export async function ensureEnquiryFollowupSchema() {
  await websiteDb().execute(
    "CREATE TABLE IF NOT EXISTS WebsiteEnquiryFollowup (enquiryId TEXT PRIMARY KEY REFERENCES WebsiteEnquiry(id) ON DELETE CASCADE, owner TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', nextContact TEXT NOT NULL DEFAULT '', revision INTEGER NOT NULL DEFAULT 1, updatedAt TEXT NOT NULL, updatedBy TEXT NOT NULL)",
  );
}
export async function saveEnquiryFollowup(
  id: string,
  input: unknown,
  actor: string,
) {
  const value = followupSchema.parse(input);
  await ensureEnquiryFollowupSchema();
  const db = websiteDb();
  if (
    !(
      await db.execute({
        sql: "SELECT id FROM WebsiteEnquiry WHERE id=?",
        args: [id],
      })
    ).rows.length
  )
    throw new Error("Enquiry not found");
  const result =
    value.revision === 0
      ? await db.execute({
          sql: "INSERT INTO WebsiteEnquiryFollowup(enquiryId,owner,notes,nextContact,updatedAt,updatedBy) VALUES(?,?,?,?,?,?) ON CONFLICT(enquiryId) DO NOTHING",
          args: [
            id,
            value.owner,
            value.notes,
            value.nextContact,
            new Date().toISOString(),
            actor,
          ],
        })
      : await db.execute({
          sql: "UPDATE WebsiteEnquiryFollowup SET owner=?,notes=?,nextContact=?,updatedAt=?,updatedBy=?,revision=revision+1 WHERE enquiryId=? AND revision=?",
          args: [
            value.owner,
            value.notes,
            value.nextContact,
            new Date().toISOString(),
            actor,
            id,
            value.revision,
          ],
        });
  if (result.rowsAffected !== 1)
    throw new Error("Enquiry follow-up changed. Reload before saving.");
}
