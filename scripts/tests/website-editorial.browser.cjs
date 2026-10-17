// Tests the real editor and route handlers against an isolated database.
// Only ERP authentication and Cloudinary are replaced with explicit fixtures.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const esbuild = require('esbuild'), puppeteer = require('puppeteer');
const root = path.resolve(__dirname, '../..'), out = path.join(root, 'tmp/website-development/editorial-browser');
async function run() {
  fs.mkdirSync(out, { recursive: true });
  process.env.WEBSITE_DATABASE_URL = `file:${path.join(out, 'fixture-' + crypto.randomUUID() + '.db').replaceAll('\\', '/')}`;
  process.env.WEBSITE_MANAGEMENT_ENABLED = 'true';
  process.env.WEBSITE_FEED_TOKEN = 'qa-only-server-feed-token-abcdefghijklmnopqrstuvwxyz';
  process.env.CLOUDINARY_CLOUD_NAME = 'qa-cloud'; process.env.CLOUDINARY_API_KEY = 'qa-key'; process.env.CLOUDINARY_API_SECRET = 'qa-secret';
  const mocks = { name: 'authorized-test-fixtures', setup(build) {
    build.onResolve({ filter: /^@\/lib\/(auth|permissions)$/ }, args => ({ path: args.path, namespace: 'qa' }));
    build.onResolve({ filter: /^@\/lib\/email\/(email-service|templates)$/ }, args => ({ path: args.path, namespace:'qa-email' }));
    build.onLoad({ filter:/.*/, namespace:'qa-email' },args => ({loader:'js',contents:args.path.endsWith('/templates') ? 'export async function getEmailTemplateByKey(){return {isActive:1}}' : 'export async function sendEmail(){return {success:true,logId:"qa-mail-log",status:"SENT"}}'}));
    build.onResolve({ filter: /^cloudinary$/ }, () => ({ path: 'cloudinary', namespace: 'qa' }));
    build.onLoad({ filter: /.*/, namespace: 'qa' }, args => ({ loader: 'js', contents: args.path.endsWith('/auth') ? 'export async function auth(){return globalThis.__qaNoAuth?null:{user:{id:"qa-admin"}}}' : args.path.endsWith('/permissions') ? 'export const PERMISSIONS={SETTINGS_MANAGE:"settings:manage"};export async function checkUserPermission(){return !globalThis.__qaNoPermission}' : 'export const v2={config(){},utils:{api_sign_request(){return "qa-signature"}},url(id){return "https://res.cloudinary.com/qa-cloud/video/upload/so_0/"+id+".jpg"},api:{async resources(){return {resources:[{public_id:"QA/existing",secure_url:"https://res.cloudinary.com/qa-cloud/image/upload/QA/existing.png",width:160,height:160}]}},async resource(id,{resource_type}){return{public_id:id,resource_type,bytes:1024,format:resource_type==="video"?"mp4":"png",width:160,height:160,duration:resource_type==="video"?3:0,secure_url:"https://res.cloudinary.com/qa-cloud/"+resource_type+"/upload/"+id+"."+(resource_type==="video"?"mp4":"png")}}}}' }));
  } };
  await esbuild.build({ stdin: { contents: 'export * as editorial from "./app/api/website/editorial/route";export * as upload from "./app/api/website/editorial/upload/route";export * as content from "./app/api/website/content/route";export * as setup from "./app/api/website/editorial/setup/route";export * as preview from "./app/api/website/editorial/preview/route";export * as cloud from "./app/api/website/editorial/cloudinary/route";', resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', jsx: 'automatic', format: 'cjs', external: ['next/server', '@libsql/client', 'zod'], outfile: path.join(out, 'api.cjs'), tsconfig: path.join(root, 'tsconfig.json'), plugins: [mocks] });
  await esbuild.build({ stdin: { contents: 'import React from "react";import{createRoot}from"react-dom/client";import{EditorialManager}from"./components/website/editorial-manager";createRoot(document.getElementById("app")).render(<EditorialManager/>);', resolveDir: root, loader: 'tsx' }, bundle: true, platform: 'browser', jsx: 'automatic', outfile: path.join(out, 'app.js'), tsconfig: path.join(root, 'tsconfig.json') });
  const css = await require('postcss')([require('@tailwindcss/postcss')()]).process(fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8'), { from: path.join(root, 'app/globals.css') });
  fs.writeFileSync(path.join(out, 'app.css'), css.css + fs.readFileSync(path.join(root,'components/website/editorial-manager.css'),'utf8') + fs.readFileSync(path.join(root,'components/website/announcement-bar.css'),'utf8'));
  await require('sharp')({ create: { width: 160, height: 160, channels: 3, background: '#2b558d' } }).png().toFile(path.join(out, 'fixture.png'));
  fs.writeFileSync(path.join(out, 'fixture.mp4'), Buffer.from('0000ftypQA-only-video-fixture'));
  const handlers = require(path.join(out, 'api.cjs')), { NextRequest } = require('next/server');
  const server = http.createServer(async (req, res) => {
    const origin = `http://127.0.0.1:${server.address().port}`, url = new URL(req.url, origin);
    const routes = { '/api/website/editorial': handlers.editorial, '/api/website/editorial/upload': handlers.upload, '/api/website/content': handlers.content, '/api/website/editorial/setup': handlers.setup, '/api/website/editorial/preview': handlers.preview, '/api/website/editorial/cloudinary': handlers.cloud };
    if (routes[url.pathname]) {
      try { const chunks = []; for await (const chunk of req) chunks.push(chunk); const method = req.method, body = Buffer.concat(chunks); const response = await routes[url.pathname][method](new NextRequest(url, { method, headers: req.headers, ...(method === 'GET' ? {} : { body }) })); res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); } catch (e) { res.writeHead(500).end(JSON.stringify({ error: e.message })); }
      return;
    }
    if (url.pathname === '/fixture.png') { res.setHeader('Content-Type', 'image/png'); return res.end(fs.readFileSync(path.join(out, 'fixture.png'))); }
    if (['/app.js', '/app.css'].includes(url.pathname)) { res.setHeader('Content-Type', url.pathname.endsWith('.js') ? 'text/javascript' : 'text/css'); return res.end(fs.readFileSync(path.join(out, url.pathname.slice(1)))); }
    res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><head><link rel="stylesheet" href="/app.css"></head><body><main id="app"></main><script src="/app.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = async (route, value, headers = {}) => fetch(origin + route, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(value) });
  let browser;
  try {
    global.__qaNoAuth = true; assert.equal((await fetch(origin + '/api/website/editorial')).status, 403); assert.equal((await post('/api/website/editorial/preview', {})).status, 403); global.__qaNoAuth = false;
    global.__qaNoPermission = true; assert.equal((await post('/api/website/editorial/setup', {})).status, 403); global.__qaNoPermission = false;
    assert.equal((await post('/api/website/editorial/setup', {}, { Origin: 'https://evil.example' })).status, 403);
    assert.equal((await post('/api/website/editorial/setup', {})).status, 200);
    assert.equal((await post('/api/website/editorial/setup', {})).status, 200);
    const first = await (await fetch(origin + '/api/website/editorial')).json(); assert.equal(first.articles.length, 187);
    const privatePreview = await (await post('/api/website/editorial/preview', first.settings.payload)).json(); assert.equal(privatePreview.preview.type,"homepage"); assert.equal(privatePreview.preview.feed.settings.heading,first.settings.payload.heading);
    assert.equal((await post('/api/website/editorial', { type: 'import-drafts' })).status, 200); assert.equal((await (await post('/api/website/editorial', { type: 'import-drafts' })).json()).imported, 0);
    assert.equal((await fetch(origin + '/api/website/content')).status, 403);
    const existingCloud = await (await fetch(origin + '/api/website/editorial/cloudinary')).json(); assert.equal(existingCloud.assets[0].publicId, 'QA/existing'); const importedCloud = await (await post('/api/website/editorial/cloudinary', { publicId: 'QA/existing', mediaType: 'image' })).json(); assert.ok(importedCloud.id); const cloudState = await (await fetch(origin + '/api/website/editorial')).json(); assert.equal(cloudState.images.find(item => item.id === importedCloud.id).status, 'pending');
    const feed = await (await fetch(origin + '/api/website/content', { headers: { Authorization: 'Bearer ' + process.env.WEBSITE_FEED_TOKEN } })).json(); assert.equal(feed.articles.length, 0);
    assert.equal((await post('/api/website/editorial/upload', { action: 'sign', mediaType: 'video', size: 101 * 1024 * 1024 })).status, 400);
    const signed = await (await post('/api/website/editorial/upload', { action: 'sign', mediaType: 'video', size: 1024 })).json(); assert.match(signed.fields.public_id, /^website\/editorial\//); assert.equal(signed.fields.overwrite, false); assert.equal(signed.fields.signature, 'qa-signature'); assert.equal(JSON.stringify(signed).includes('qa-secret'), false);
    assert.equal((await post('/api/website/editorial/upload', { action: 'complete', grantId: signed.grantId })).status, 200);
    assert.equal((await post('/api/website/editorial/upload', { action: 'complete', grantId: signed.grantId })).status, 200);
    const protectedKey = crypto.createHash('sha256').update('qa contact').digest('hex');
    assert.equal((await post('/api/website/content', { type: 'contact', key: protectedKey, name: 'QA visitor', email: 'qa@example.org', subject: 'QA enquiry', message: 'Isolated QA enquiry message.', consent: false }, { Authorization: 'Bearer ' + process.env.WEBSITE_FEED_TOKEN })).status, 400);
    assert.equal((await post('/api/website/content', { type: 'contact', key: protectedKey, name: 'QA visitor', email: 'qa@example.org', subject: 'QA enquiry', message: 'Isolated QA enquiry message.', consent: true }, { Authorization: 'Bearer ' + process.env.WEBSITE_FEED_TOKEN })).status, 201);
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message)); await page.emulateTimezone('Asia/Kolkata');
    await page.setRequestInterception(true);
    page.on('request', request => {
      if (request.url().startsWith(origin) || request.url().startsWith('data:') || request.url().startsWith('about:')) return request.continue();
      if (request.url().startsWith('https://api.cloudinary.com/qa') || request.url().startsWith('https://api.cloudinary.com/v1_1/qa-cloud/')) return request.respond({ status: 200, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS' }, contentType: 'application/json', body: '{}' });
      if (request.url().startsWith('https://res.cloudinary.com/qa-cloud/') && request.url().endsWith('.png')) return request.respond({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(out, 'fixture.png')) });
      return request.abort();
    });
    const click = async text => { for (const handle of await page.$$('button')) if ((await handle.evaluate(e => e.getAttribute("aria-label") || e.textContent)).trim() === text) { await handle.click(); return; } throw new Error('Missing button: ' + text); };
    const fill = async (label, value) => page.evaluate((label, value) => { const node = [...document.querySelectorAll('label')].find(l => l.querySelector('span')?.textContent === label || l.dataset.field === label)?.querySelector('input,textarea'); if (!node) throw new Error('Missing input: ' + label); const proto = node.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }, label, value);
    for (const width of [1440, 768, 390]) {
      await page.setViewport({ width, height: 1000 }); await page.goto(origin, { waitUntil: 'networkidle0' }); await page.waitForFunction(() => document.body.textContent.includes('Planned entries'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `ERP overflow at ${width}`);
      await page.screenshot({ path: path.join(out, `coverage-${width}.png`), fullPage: false });
    }
    await click('Articles'); await click('New article'); await fill('Title', 'QA browser guide'); await fill('URL slug', 'qa-browser-guide'); await fill('Introduction', 'QA browser draft saved through the real editor API. This is an isolated test record.'); await click('Save draft'); await page.waitForFunction(() => document.querySelector('[role=status]').textContent.startsWith('Draft saved'));
    await click('Preview full article page'); await page.waitForSelector('iframe[title="Private article page preview"]'); await click('Close article page preview'); await click('Preview draft'); assert.match(await page.$eval('body', e => e.textContent), /Private draft preview/); await click('Edit content'); await click('Revision history'); await page.waitForFunction(() => document.body.textContent.includes('Revision 1'));
    await click('Media & rights'); await (await page.$('input[type=file]')).uploadFile(path.join(out, 'fixture.png')); await page.waitForFunction(() => document.querySelector('[role=status]').textContent.startsWith('Upload saved'));
    await fill('title', 'QA Cloudinary image'); await fill('Accessible description', 'QA upload thumbnail'); await click('Save media details'); await page.waitForFunction(() => document.querySelector('[role=status]').textContent.startsWith('Media details'));
    assert.equal(await page.$$eval('img', nodes => nodes.filter(n => n.naturalWidth > 0).length) > 0, true);
    await page.screenshot({ path: path.join(out, 'media-390.png'), fullPage: true });
    await click('Site information'); await click('Preview homepage'); await page.waitForSelector('iframe[title="Private homepage preview"]'); await click('Close homepage preview'); await fill('heading', 'QA gemstone knowledge library'); await click('Save website information'); await page.waitForFunction(() => document.querySelector('[role=status]').textContent.startsWith('Website information saved'));
    await click('Announcements');await click('Birthstone guide');
    await page.waitForFunction(()=>document.querySelector('[data-announcement-preview]')?.textContent.includes('Discover your birthstone'));
    assert.match(await page.$eval('[data-announcement-preview]',e=>e.textContent),/Find your birthstone/);
    await page.evaluate(()=>{const label=[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Enable on website'));label.querySelector('input').click();});
    await click('Save announcements');await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Website information saved'));
    let saved=await(await fetch(origin+'/api/website/editorial')).json();assert.equal(saved.settings.payload.announcements[0].enabled,true);
    for(const width of [1440,768,390]){await page.setViewport({width,height:1000});await click(width===390?'Mobile':width===768?'Tablet':'Desktop');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,`announcements-${width}.png`),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Announcements overflow ${width}`);}
    await page.setViewport({width:1440,height:1000});await page.evaluate(()=>document.getElementById('app').style.marginLeft='240px');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Fits beside ERP sidebar');await page.screenshot({path:path.join(out,'announcements-erp-shell.png'),fullPage:true});await page.evaluate(()=>document.getElementById('app').style.marginLeft='0');await page.setViewport({width:390,height:1000});await click('Mobile');
    await page.evaluate(()=>document.documentElement.classList.add('dark'));await page.screenshot({path:path.join(out,'announcements-dark-390.png'),fullPage:true});await page.evaluate(()=>document.documentElement.classList.remove('dark'));
    await click('Duplicate');await click('Site information');await fill('heading','Unsaved heading persists');await click('Announcements');await click('Site information');assert.equal(await page.$eval('[data-field=heading] input',e=>e.value),'Unsaved heading persists');
    await click('Save website information');await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Website information saved'));
    await click('Enquiries'); assert.match(await page.$eval('body', e => e.textContent), /QA enquiry/); assert.match(await page.$eval('body', e=>e.textContent),/KG-ENQ-\d{8}-\d{5,}/); await page.type('input[name=owner]','QA lead team'); await page.type('textarea[name=notes]','Follow-up saved in ERP'); await click('Save follow-up'); await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Follow-up saved')); assert.equal((await (await fetch(origin+'/api/website/editorial')).json()).enquiries[0].owner,'QA lead team'); await click('Mark resolved'); await page.waitForFunction(() => document.body.textContent.includes('Reopen'));
    assert.deepEqual(errors, []);
    console.log('PASS: real ERP editor/API fixtures, 187-entry setup and idempotence, auth/permission/CSRF checks, private public-feed projection, image/video upload verification, Cloudinary thumbnail, drafts/previews/revisions, site information, consent and enquiry resolution at desktop/tablet/mobile.');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });

