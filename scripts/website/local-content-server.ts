/** Loopback development bridge to the real ERP website handlers. No auth bypass for ERP UI. */
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { config } from "dotenv";
import { NextRequest } from "next/server";
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Local bridge is development only");
  const url = process.env.WEBSITE_DATABASE_URL || "";
  const localRoot = path.resolve("tmp/website-development");
  if (
    !url.startsWith("file:") ||
    !path.resolve(url.slice(5)).startsWith(localRoot + path.sep)
  )
    throw new Error("Use the local website database only");
  const { GET, POST } = await import("../../app/api/website/content/route");
  const { websiteDb } = await import("../../lib/website/editorial/database");
  const { ensureEnquiryEmailSchema } =
    await import("../../lib/website/editorial/enquiry-email");
  const { editorialSql } = await import("../../lib/website/editorial/schema");
  const db = websiteDb();
  const before = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Website%'",
  );
  const backup: Record<string, unknown> = {};
  for (const row of before.rows) {
    const name = String(row.name);
    if (!/^Website[A-Za-z0-9_]+$/.test(name))
      throw new Error("Unexpected website table");
    backup[name] = (await db.execute(`SELECT * FROM "${name}"`)).rows;
  }
  const backupFolder = path.join(localRoot, "backups");
  fs.mkdirSync(backupFolder, { recursive: true });
  fs.writeFileSync(
    path.join(backupFolder, `local-bridge-${Date.now()}.json`),
    JSON.stringify(backup, (_, value) =>
      typeof value === "bigint" ? String(value) : value,
    ),
  );
  for (const statement of editorialSql
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean))
    await db.execute(statement);
  const { importDraftBundle } =
    await import("../../lib/website/editorial/store");
  const first = (await import("../../lib/website/editorial/first-drafts.json"))
    .default;
  const supporting = (
    await import("../../lib/website/editorial/supporting-drafts.json")
  ).default;
  await importDraftBundle(
    [
      ...first,
      ...supporting,
      (await import("../../lib/website/editorial/expanded-library-drafts.json"))
        .default,
    ].flat(),
    "system:local-development",
  );
  await ensureEnquiryEmailSchema();
  const server = http.createServer(async (incoming, outgoing) => {
    if (
      incoming.url !== "/api/website/content" ||
      !["GET", "POST"].includes(incoming.method || "")
    ) {
      outgoing.writeHead(404).end();
      return;
    }
    try {
      const chunks: Buffer[] = [];
      let length = 0;
      for await (const chunk of incoming) {
        length += chunk.length;
        if (length > 16000) {
          outgoing.writeHead(413).end();
          return;
        }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers))
        if (value)
          headers.set(name, Array.isArray(value) ? value.join(",") : value);
      const req = new NextRequest("http://127.0.0.1:3011/api/website/content", {
        method: incoming.method,
        headers,
        ...(incoming.method === "POST"
          ? { body: Buffer.concat(chunks).toString() }
          : {}),
      });
      const response =
        incoming.method === "POST" ? await POST(req) : await GET(req);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      outgoing
        .writeHead(503)
        .end(
          JSON.stringify({ error: "Local ERP content service unavailable" }),
        );
    }
  });
  server.listen(3011, "127.0.0.1", () =>
    console.log(
      "Local ERP website service ready at http://127.0.0.1:3011 (local website database; email uses existing ERP configuration on real submissions).",
    ),
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
