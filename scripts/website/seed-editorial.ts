import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';
import { contentSchema } from '../../lib/website/editorial/contract';

async function main() {
  const url = process.env.WEBSITE_DATABASE_URL;
  const source = process.argv[2];
  if (!url || !source) throw new Error('Supply WEBSITE_DATABASE_URL and the absolute GEMSTONE_MASTER_REGISTRY.json path');
  if (!url.startsWith('file:') && (new URL(url).hostname !== 'khyati-website-content-kgadmin.aws-ap-south-1.turso.io' || process.env.WEBSITE_MIGRATION_TARGET !== new URL(url).hostname)) throw new Error('Confirm the dedicated website database target');
  if (url.startsWith('file:') && !path.resolve(url.slice(5)).startsWith(path.resolve('tmp/website-development') + path.sep)) throw new Error('Use an isolated website database');
  const registry = JSON.parse(fs.readFileSync(source, 'utf8'));
  const db = createClient({ url, authToken: process.env.WEBSITE_DATABASE_AUTH_TOKEN });
  const tx = await db.transaction('write');
  let inserted = 0;
  try {
    for (const entry of registry.entries) {
      const grouped = /Traditional/.test(entry.coverageGroup || '');
      const content = contentSchema.parse({ kind: grouped ? 'glossary' : 'gemstones', title: entry.proposedName, slug: entry.slug });
      const id = String(entry.id), now = new Date().toISOString();
      const result = await tx.execute({ sql: "INSERT INTO WebsiteArticle(id,kind,slug,payload,stage,updatedAt) VALUES(?,?,?,?,'research',?) ON CONFLICT DO NOTHING", args: [id, content.kind, content.slug, JSON.stringify(content), now] });
      if (result.rowsAffected) {
        inserted++;
        await tx.execute({ sql: "INSERT INTO WebsiteArticleRevision(id,articleId,revision,payload,stage,action,actor,createdAt) VALUES(?,?,1,?,'research','registry-import','system:registry-import',?)", args: [randomUUID(), id, JSON.stringify(content), now] });
      }
    }
    await tx.commit();
    console.log(`Imported ${inserted} research-only entries. Existing content and all publications were preserved.`);
  } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
