import { websiteDb } from "./database";
import { ensureEnquiryEmailSchema } from "./enquiry-email";
import { ensureEnquiryFollowupSchema } from "./enquiry-followup";
import { ensureEnquiryReferences } from "./enquiry-reference";
export type EnquiryFilter = {
  page?: number;
  query?: string;
  status?: "all" | "new" | "resolved";
  due?: boolean;
};
const referenceSql =
  "('KG-ENQ-' || replace(substr(e.createdAt,1,10),'-','') || '-' || printf('%05d',r.sequence))";
export async function listEnquiries(filter: EnquiryFilter = {}) {
  await ensureEnquiryEmailSchema();
  await ensureEnquiryFollowupSchema();
  await ensureEnquiryReferences();
  const db = websiteDb(),
    where: string[] = [],
    args: (string | number)[] = [];
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const join =
    " FROM WebsiteEnquiry e LEFT JOIN WebsiteEnquiryEmail m ON m.enquiryId=e.id LEFT JOIN WebsiteEnquiryReference r ON r.enquiryId=e.id LEFT JOIN WebsiteEnquiryFollowup f ON f.enquiryId=e.id";
  const query = (filter.query || "").trim().slice(0, 200);
  if (query) {
    const term = "%" + query.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
    where.push(
      `(${referenceSql} LIKE ? ESCAPE '\\' OR e.name LIKE ? ESCAPE '\\' OR e.email LIKE ? ESCAPE '\\' OR e.subject LIKE ? ESCAPE '\\' OR f.owner LIKE ? ESCAPE '\\')`,
    );
    args.push(...Array(5).fill(term));
  }
  if (filter.status && filter.status !== "all") {
    where.push("e.status=?");
    args.push(filter.status);
  }
  if (filter.due) {
    where.push("e.status='new' AND f.nextContact<>'' AND f.nextContact<=?");
    args.push(today);
  }
  const condition = where.length ? " WHERE " + where.join(" AND ") : "";
  const total = Number(
    (
      await db.execute({
        sql: "SELECT count(*) AS total" + join + condition,
        args,
      })
    ).rows[0].total,
  );
  const pageSize = 50,
    page = Math.min(
      Math.max(0, Math.floor(filter.page || 0)),
      Math.max(0, Math.ceil(total / pageSize) - 1),
    );
  const rows = await db.execute({
    sql:
      `SELECT e.id,e.name,e.email,e.subject,e.message,e.status,e.createdAt,${referenceSql} AS reference,m.status AS emailStatus,m.logId AS emailLogId,m.updatedAt AS emailUpdatedAt,f.owner,f.notes,f.nextContact,COALESCE(f.revision,0) AS followupRevision` +
      join +
      condition +
      " ORDER BY e.createdAt DESC,e.id DESC LIMIT ? OFFSET ?",
    args: [...args, pageSize, page * pageSize],
  });
  const counts = (
    await db.execute({
      sql: "SELECT count(*) AS total,SUM(CASE WHEN e.status='new' THEN 1 ELSE 0 END) AS open,SUM(CASE WHEN e.status='new' AND f.nextContact<>'' AND f.nextContact<=? THEN 1 ELSE 0 END) AS due FROM WebsiteEnquiry e LEFT JOIN WebsiteEnquiryFollowup f ON f.enquiryId=e.id",
      args: [today],
    })
  ).rows[0];
  return {
    enquiries: rows.rows,
    enquiryPagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
      allTotal: Number(counts.total),
      open: Number(counts.open || 0),
      due: Number(counts.due || 0),
      query,
      status: filter.status || "all",
      dueOnly: !!filter.due,
    },
  };
}
