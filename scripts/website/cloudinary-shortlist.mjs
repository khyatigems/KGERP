// Read-only Cloudinary inventory. Never uploads, changes assets, or approves rights.
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
const destination = process.argv[2];
if (!destination || !path.isAbsolute(destination)) throw new Error('Supply an absolute local output JSON path');
const config = {};
for (const file of ['.env', '.env.local']) if (fs.existsSync(file)) {
  const values = dotenv.parse(fs.readFileSync(file));
  for (const key of ['CLOUDINARY_CLOUD_NAME', 'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) if (values[key]) config[key] = values[key];
}
const cloud = config.CLOUDINARY_CLOUD_NAME || config.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
if (!cloud || !config.CLOUDINARY_API_KEY || !config.CLOUDINARY_API_SECRET) throw new Error('The ERP Cloudinary connection is not configured locally');
cloudinary.config({ cloud_name: cloud, api_key: config.CLOUDINARY_API_KEY, api_secret: config.CLOUDINARY_API_SECRET, secure: true });
try {
  const assets = [];
  let cursor;
  for (let page = 0; page < 3; page++) {
    const data = await cloudinary.api.resources({ resource_type: 'image', type: 'upload', max_results: 100, context: true, tags: true, ...(cursor ? { next_cursor: cursor } : {}) });
    assets.push(...data.resources.filter(r => ['jpg', 'jpeg', 'png', 'webp'].includes(r.format)).map(r => ({ publicId: r.public_id, folder: r.asset_folder || r.public_id.split('/').slice(0, -1).join('/') || '(root)', displayName: r.display_name || r.public_id.split('/').pop(), url: r.secure_url, thumbnail: cloudinary.url(r.public_id, { secure: true, transformation: [{ width: 420, height: 320, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] }), width: r.width, height: r.height, tags: r.tags || [], caption: r.context?.custom?.caption || '', createdAt: r.created_at, approval: 'Pending owner selection and image-rights confirmation' })));
    cursor = data.next_cursor;
    if (!cursor) break;
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, JSON.stringify({ retrievedAt: new Date().toISOString(), assets, moreAvailable: !!cursor, note: 'Cloudinary storage does not establish specimen identity or image-rights approval. Albums are not returned by this API; folder/public IDs are recorded exactly.' }, null, 2));
  console.log(`Recorded ${assets.length} public image candidates with exact folder/public IDs. No asset was changed or approved.`);
} catch (error) { console.error('Cloudinary inventory lookup failed; status ' + (error.http_code || 'unavailable')); process.exitCode = 1; }
