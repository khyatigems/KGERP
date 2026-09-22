import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

function parseLibsqlCredentials(rawUrl: string) {
  const normalized = rawUrl.startsWith("https://") ? rawUrl.replace(/^https:\/\//, "libsql://") : rawUrl;
  const [base, query = ""] = normalized.split("?");
  const authToken =
    new URLSearchParams(query).get("authToken") ??
    process.env.TURSO_AUTH_TOKEN ??
    process.env.TURSO_TOKEN ??
    undefined;
  return { url: base, authToken };
}

const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
const tursoDatabaseUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || "";
const isLibsql = !!tursoDatabaseUrl || databaseUrl.startsWith("libsql:") || databaseUrl.startsWith("https:");

const adapter = isLibsql
  ? new PrismaLibSQL(
      (() => {
        const source = tursoDatabaseUrl || databaseUrl;
        const { url, authToken } = parseLibsqlCredentials(source);
        console.log("Connecting to:", url);
        return createClient({ url, authToken });
      })()
    )
  : undefined;

const prisma = new PrismaClient(
  adapter ? { adapter } : { datasources: { db: { url: databaseUrl } } }
);

const FLAGS = [
  { key: "marketplaceApiSyncEnabled", value: "true", description: "Master switch for marketplace API synchronization" },
  { key: "ebaySyncEnabled", value: "true", description: "Enables eBay read/sync via official API" },
  { key: "etsySyncEnabled", value: "true", description: "Enables Etsy read/sync via official API" },
];

async function main() {
  for (const flag of FLAGS) {
    const existing = await prisma.setting.findUnique({ where: { key: flag.key } });
    if (existing) {
      await prisma.setting.update({ where: { key: flag.key }, data: { value: flag.value } });
      console.log(`Updated ${flag.key} = ${flag.value}`);
    } else {
      await prisma.setting.create({ data: flag });
      console.log(`Created ${flag.key} = ${flag.value}`);
    }
  }
  console.log("Done. All marketplace sync flags enabled.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
