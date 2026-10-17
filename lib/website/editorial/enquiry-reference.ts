import { websiteDb } from "./database";
// Customer-facing number is persisted separately; internal UUIDs remain unchanged.
export async function ensureEnquiryReferences() {
  const db = websiteDb();
  await db.execute(
    "CREATE TABLE IF NOT EXISTS WebsiteEnquiryReference (sequence INTEGER PRIMARY KEY AUTOINCREMENT, enquiryId TEXT NOT NULL UNIQUE REFERENCES WebsiteEnquiry(id) ON DELETE CASCADE)",
  );
  await db.execute(
    "INSERT OR IGNORE INTO WebsiteEnquiryReference(enquiryId) SELECT e.id FROM WebsiteEnquiry e WHERE NOT EXISTS (SELECT 1 FROM WebsiteEnquiryReference r WHERE r.enquiryId=e.id) ORDER BY e.createdAt,e.id",
  );
}
export async function enquiryReference(id: string) {
  await ensureEnquiryReferences();
  const row = (
    await websiteDb().execute({
      sql: "SELECT r.sequence,e.createdAt FROM WebsiteEnquiryReference r JOIN WebsiteEnquiry e ON e.id=r.enquiryId WHERE e.id=?",
      args: [id],
    })
  ).rows[0];
  if (!row) throw new Error("Enquiry not found");
  return `KG-ENQ-${String(row.createdAt).slice(0, 10).replaceAll("-", "")}-${String(row.sequence).padStart(5, "0")}`;
}
