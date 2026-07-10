const puppeteer = require('puppeteer');
// Ensure Prisma has a datasource URL (match runtime fallback)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const http = require('http');

const prisma = new PrismaClient();

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          // consume data and resolve
          res.on('data', () => {});
          res.on('end', () => {
            resolve(res.statusCode && res.statusCode < 500);
          });
        });
        req.on('error', () => resolve(false));
        req.setTimeout(3000, () => { req.destroy(); resolve(false); });
      });
      if (ok) return true;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not respond in time');
}

async function run() {
  const testEmail = 'e2e+puppeteer@example.com';
  const rawPassword = 'PuppeteerTest123!';

  // Ensure test user exists
  const hashed = await bcrypt.hash(rawPassword, 10);
  await prisma.user.upsert({
    where: { email: testEmail },
    update: { password: hashed, name: 'E2E Puppeteer' },
    create: {
      email: testEmail,
      password: hashed,
      name: 'E2E Puppeteer',
      role: 'ADMIN',
    }
  });

  // Clean existing activity logs for this user
  await prisma.activityLog.deleteMany({ where: { userEmail: testEmail } }).catch(() => {});

  // Wait for local dev server
  const base = 'http://localhost:3000';
  console.log('Waiting for server...');
  await waitForServer(base);
  console.log('Server is up');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(base + '/login', { waitUntil: 'networkidle2' });

    await page.type('input[name=email]', testEmail, { delay: 30 });
    await page.type('input[name=password]', rawPassword, { delay: 30 });
    await Promise.all([
      page.click('button[type=submit]'),
      page.waitForURL(base + '/', { timeout: 30000 })
    ]);

    console.log('Logged in, navigating away and reopening to simulate auto-login');

    // Close the page to simulate window close
    await page.close();

    // Open a new page to simulate reopening the app
    const page2 = await browser.newPage();
    await page2.goto(base + '/', { waitUntil: 'networkidle2' });

    // Wait a bit for Topbar refresh logic to run and server to process
    await new Promise(r => setTimeout(r, 5000));

    // Query activity logs
    const logs = await prisma.activityLog.findMany({ where: { userEmail: testEmail, actionType: 'LOGIN' }, orderBy: { createdAt: 'desc' } });
    console.log('Login activity count for test user:', logs.length);
    logs.slice(0,5).forEach(l => console.log(l.id, l.actionType, l.idempotencyKey, l.createdAt));

    if (logs.length > 1) {
      console.error('ERROR: Expected at most 1 LOGIN activity after auto-login, found', logs.length);
      process.exitCode = 2;
    } else {
      console.log('OK: Idempotency behavior looks correct (<=1 LOGIN entry)');
    }

    await page2.close();
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exitCode = 1;
});
