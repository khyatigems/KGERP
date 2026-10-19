import fs from 'node:fs';
const sql = fs.readFileSync(new URL('./editorial.sql', import.meta.url), 'utf8');
fs.writeFileSync(new URL('../../lib/website/editorial/schema.ts', import.meta.url), '// Generated from scripts/website/editorial.sql; parity is checked by tests.\nexport const editorialSql = ' + JSON.stringify(sql) + ';\n');
console.log('Updated the server-bundled editorial schema.');
