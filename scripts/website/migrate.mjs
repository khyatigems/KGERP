import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const url = process.env.WEBSITE_DATABASE_URL;
if (!url || !url.startsWith('file:')) throw new Error('This development migrator accepts only an explicitly supplied local file: WEBSITE_DATABASE_URL. No environment files are loaded.');
const rawPath = url.slice(5);
const target = path.resolve(rawPath);
const root = path.resolve('tmp','website-development');
if (!target.startsWith(root + path.sep) || !target.endsWith('.db')) throw new Error('Database must be a .db file inside tmp/website-development');
const migrations = [
  ['001-foundation', 'schema.sql'],
  ['002-orders', 'orders.sql'],
].map(([id, file]) => ({ id, sql: fs.readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), 'utf8') }));
for (const migration of migrations) if (/\b(DROP|ALTER|DELETE|UPDATE|TRUNCATE)\b/i.test(migration.sql)) throw new Error(`Non-additive migration rejected: ${migration.id}`);
fs.mkdirSync(root,{recursive:true});
if (fs.existsSync(target)) fs.copyFileSync(target, `${target}.${Date.now()}.backup`);
const client = createClient({url: `file:${target.replaceAll('\\','/')}`});
try {
  const tx = await client.transaction('write');
  try {
    for (const migration of migrations) {
      const checksum = crypto.createHash('sha256').update(migration.sql).digest('hex');
      const existing = await tx.execute({sql:'SELECT checksum FROM WebsiteMigration WHERE id=?',args:[migration.id]});
      if (existing.rows.length) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration checksum changed: ${migration.id}`);
        continue;
      }
      for (const statement of migration.sql.split(';').map(s=>s.trim()).filter(Boolean)) await tx.execute(statement);
      await tx.execute({sql:'INSERT INTO WebsiteMigration(id,checksum) VALUES(?,?)',args:[migration.id,checksum]});
    }
    await tx.commit();
  } catch(error) { await tx.rollback(); throw error; } finally { tx.close(); }
  console.log('Website-only local migrations completed. ERP tables and database were not accessed.');
} finally { client.close(); }
