import { createClient } from '@libsql/client';
import fs from 'node:fs';
import crypto from 'node:crypto';

const targetUrl = process.env.WEBSITE_DATABASE_URL;
const targetToken = process.env.WEBSITE_DATABASE_AUTH_TOKEN;
const sourcePath = 'tmp/website-development/management.db';
const erpUrl = process.env.DATABASE_URL?.split('?')[0];
if (!targetUrl?.startsWith('libsql://') || !targetToken) throw new Error('Remote website database URL and scoped auth token are required.');
if (targetUrl.split('?')[0] === erpUrl) throw new Error('Refusing to use the ERP database.');
if (!fs.existsSync(sourcePath)) throw new Error('Saved local website content database is missing.');

const target = createClient({ url: targetUrl, authToken: targetToken });
const source = createClient({ url: `file:${sourcePath}` });
const migrations = [
  ['001-foundation', fs.readFileSync('scripts/website/schema.sql', 'utf8')],
  ['002-orders', fs.readFileSync('scripts/website/orders.sql', 'utf8')],
];

try {
  const tx = await target.transaction('write');
  try {
    for (const [id, sql] of migrations) {
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const current = await tx.execute({ sql: 'SELECT checksum FROM WebsiteMigration WHERE id=?', args: [id] }).catch(() => ({ rows: [] }));
      if (current.rows.length) {
        if (String(current.rows[0].checksum) !== checksum) throw new Error(`Remote website migration checksum mismatch: ${id}`);
        continue;
      }
      for (const statement of sql.split(';').map(value => value.trim()).filter(Boolean)) await tx.execute(statement);
      await tx.execute({ sql: 'INSERT INTO WebsiteMigration(id,checksum) VALUES(?,?)', args: [id, checksum] });
    }

    const localRecords = await source.execute('SELECT id,section,payload,revision,createdAt,updatedAt FROM WebsiteRecord');
    const remoteRecords = await tx.execute('SELECT id,payload FROM WebsiteRecord');
    if (remoteRecords.rows.length && remoteRecords.rows.length !== localRecords.rows.length) throw new Error('Remote database already contains different website records; import stopped.');
    for (const row of localRecords.rows) {
      const existing = remoteRecords.rows.find(record => String(record.id) === String(row.id));
      if (existing) {
        if (String(existing.payload) !== String(row.payload)) throw new Error('Remote website content differs from the local source; import stopped.');
        continue;
      }
      await tx.execute({ sql: 'INSERT INTO WebsiteRecord(id,section,payload,revision,createdAt,updatedAt) VALUES(?,?,?,?,?,?)', args: [row.id,row.section,row.payload,row.revision,row.createdAt,row.updatedAt] });
    }

    const localAudit = await source.execute('SELECT id,recordId,actor,payload,createdAt FROM WebsiteAudit');
    const remoteAudit = await tx.execute('SELECT id FROM WebsiteAudit');
    if (!remoteAudit.rows.length) {
      for (const row of localAudit.rows) await tx.execute({ sql: 'INSERT INTO WebsiteAudit(id,recordId,actor,payload,createdAt) VALUES(?,?,?,?,?)', args: [row.id,row.recordId,row.actor,row.payload,row.createdAt] });
    }
    await tx.commit();
    process.stdout.write(`Remote website schema ready; imported ${localRecords.rows.length} website records and ${localAudit.rows.length} audit entries.\n`);
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    tx.close();
  }
} finally {
  await source.close();
  await target.close();
}
