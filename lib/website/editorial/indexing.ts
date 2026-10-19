import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { websiteDb } from './database';
const schema = z.object({ articleId: z.string().min(1), platform: z.enum(['Google', 'Bing']), status: z.enum(['Unknown', 'Submitted', 'Indexed', 'Excluded']), evidence: z.string().trim().max(3000), checkedAt: z.string().date(), confirmed: z.literal(true) }).strict();
export async function saveIndexObservation(raw: unknown, actor: string) {
  const value = schema.parse(raw);
  if (value.checkedAt > new Date().toISOString().slice(0, 10)) throw new Error('Indexing observations cannot be dated in the future');
  if (value.status !== 'Unknown' && value.evidence.length < 20) throw new Error('Record evidence from the relevant search platform');
  const db = websiteDb();
  const article = (await db.execute({ sql: 'SELECT publishedAt FROM WebsiteArticle WHERE id=?', args: [value.articleId] })).rows[0];
  if (!article?.publishedAt) throw new Error('Indexing evidence requires a published article');
  await db.execute({ sql: 'INSERT INTO WebsiteIndexObservation(id,articleId,platform,status,evidence,checkedAt,actor) VALUES(?,?,?,?,?,?,?) ON CONFLICT(articleId,platform) DO UPDATE SET status=excluded.status,evidence=excluded.evidence,checkedAt=excluded.checkedAt,actor=excluded.actor', args: [randomUUID(), value.articleId, value.platform, value.status, value.evidence, value.checkedAt, actor] });
}
