import { createClient } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const url = process.env.WEBSITE_DATABASE_URL;
const knownHost = 'khyati-website-content-kgadmin.aws-ap-south-1.turso.io';
if (!url) throw new Error('Supply WEBSITE_DATABASE_URL explicitly; environment files are not loaded.');
const identity = value => value?.split('?')[0].replace(/\/$/, '').toLowerCase();
if ([process.env.DATABASE_URL, process.env.TURSO_DATABASE_URL, process.env.TURSO_URL].some(value => value && identity(value) === identity(url))) throw new Error('Refusing the ERP database');
if (url.startsWith('file:')) {
  const target = path.resolve(url.slice(5)), root = path.resolve('tmp/website-development');
  if (!target.startsWith(root + path.sep) || !target.endsWith('.db')) throw new Error('Local database must be inside tmp/website-development');
  fs.mkdirSync(root, { recursive: true });
} else if (!url.startsWith('libsql://') || new URL(url).hostname !== knownHost || process.env.WEBSITE_MIGRATION_TARGET !== knownHost || !process.env.WEBSITE_DATABASE_AUTH_TOKEN) {
  throw new Error('Remote migration requires the exact dedicated website host, scoped token and WEBSITE_MIGRATION_TARGET acknowledgement');
}
const sql = fs.readFileSync(new URL('./editorial.sql', import.meta.url), 'utf8');
if (/\b(DROP|ALTER|DELETE|UPDATE|TRUNCATE)\b/i.test(sql)) throw new Error('Only additive schema statements are permitted');
const client = createClient({ url, authToken: process.env.WEBSITE_DATABASE_AUTH_TOKEN });
const checksum = crypto.createHash('sha256').update(sql).digest('hex');
try {
  // Consistent logical backup before adding tables. Includes existing website records only.
  const read = await client.transaction('read');
  const backup = {};
  try {
    const tables = await read.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Website%'");
    for (const row of tables.rows) {
      const name = String(row.name);
      if (!/^Website[A-Za-z0-9_]+$/.test(name)) throw new Error('Unexpected website table');
      backup[name] = (await read.execute(`SELECT * FROM "${name}"`)).rows;
    }
    await read.commit();
  } finally { read.close(); }
  const backupDir = path.resolve('tmp/website-development/backups');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, `editorial-${Date.now()}.json`), JSON.stringify(backup, (_, v) => typeof v === 'bigint' ? String(v) : v));
  const tx = await client.transaction('write');
  try {
    await tx.execute(sql.split(';')[0]);
    const existing = (await tx.execute({ sql: 'SELECT checksum FROM WebsiteEditorialMigration WHERE id=?', args: ['001-editorial'] })).rows[0];
    if (existing && existing.checksum !== checksum) throw new Error('Applied migration checksum differs');
    if (!existing) {
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await tx.execute(statement);
      await tx.execute({ sql: 'INSERT INTO WebsiteEditorialMigration(id,checksum) VALUES(?,?)', args: ['001-editorial', checksum] });
    }
    await tx.commit();
    console.log('Website editorial schema ready. Existing records preserved; no ERP tables accessed.');
  } catch (error) { await tx.rollback(); throw error; } finally { tx.close(); }
} finally { client.close(); }
