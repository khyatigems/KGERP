import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

// 1. Load Environment Variables (mimicking Next.js priority: .env.local > .env)
const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPathDefault = path.resolve(process.cwd(), ".env");
const envVars: Record<string, string> = {};

// Load .env first
if (fs.existsSync(envPathDefault)) {
  const content = fs.readFileSync(envPathDefault, "utf-8");
  parseEnv(content, envVars);
}

// Override with .env.local
if (fs.existsSync(envPathLocal)) {
  const content = fs.readFileSync(envPathLocal, "utf-8");
  parseEnv(content, envVars);
}

// Helper to parse env content
function parseEnv(content: string, target: Record<string, string>) {
  content.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      const key = match[1].trim();
      target[key] = value;
    }
  });
}

// Set process.env for Prisma
if (envVars.DATABASE_URL) {
  process.env.DATABASE_URL = envVars.DATABASE_URL;
}

const connectionString = process.env.DATABASE_URL;

console.log("\n--- DIAGNOSTIC: DATABASE CONNECTION ---");
console.log("Loaded DATABASE_URL from env files.");
if (connectionString) {
  const isLibsql = connectionString.startsWith('libsql:') || connectionString.startsWith('https:');
  console.log(`URL Protocol: ${connectionString.split(':')[0]}`);
  console.log(`Target: ${isLibsql ? 'Turso / LibSQL' : 'Local SQLite / Other'}`);
  console.log(`Masked URL: ${connectionString.substring(0, 15)}...`);
} else {
  console.error("CRITICAL: DATABASE_URL is undefined!");
  process.exit(1);
}

async function main() {
  const isLibsql = connectionString?.startsWith('libsql:') || connectionString?.startsWith('https:');
  
  let prisma;
  try {
    if (isLibsql) {
        console.log("Initializing Prisma with LibSQL Adapter...");
        const client = createClient({ url: connectionString!, authToken: process.env.TURSO_AUTH_TOKEN }); // Auth token might be in URL or separate
        const adapter = new PrismaLibSQL(client);
        prisma = new PrismaClient({ adapter });
    } else {
        console.log("Initializing Prisma with Standard Client...");
        prisma = new PrismaClient();
    }

    console.log("\n--- QUERYING DATABASE ---");
    const userCount = await prisma.user.count();
    const inventoryCount = await prisma.inventory.count();
    const vendorCount = await prisma.vendor.count();

    console.log(`[Users Found]:     ${userCount}`);
    console.log(`[Inventory Items]: ${inventoryCount}`);
    console.log(`[Vendors Found]:   ${vendorCount}`);
    
    if (inventoryCount > 0) {
      const items = await prisma.inventory.findMany({ 
        take: 5, 
        select: { sku: true, itemName: true, createdAt: true } 
      });
      console.log("\nSample Inventory Items:");
      items.forEach(i => console.log(` - ${i.sku}: ${i.itemName} (Created: ${i.createdAt.toISOString()})`));
    } else {
      console.log("\nInventory is EMPTY.");
    }

  } catch (e) {
    console.error("\n!!! CONNECTION ERROR !!!");
    console.error(e);
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  // SECONDARY CHECK: LOCAL DB
  console.log("\n--- DIAGNOSTIC: LOCAL SQLITE CHECK ---");
  const localDbPath = path.resolve(process.cwd(), 'prisma/dev.db');
  if (fs.existsSync(localDbPath)) {
      console.log(`Found local DB at: ${localDbPath}`);
      const prismaLocal = new PrismaClient({
          datasources: { db: { url: `file:${localDbPath}` } }
      });
      try {
          const localCount = await prismaLocal.inventory.count();
          console.log(`[Local Inventory Items]: ${localCount}`);
          if (localCount > 0) {
            const items = await prismaLocal.inventory.findMany({ take: 3, select: { sku: true, itemName: true } });
            console.log("Sample Local Items:", items.map(i => `${i.sku} (${i.itemName})`));
          }
      } catch (e) {
          console.error("Failed to read local DB:", e);
      } finally {
          await prismaLocal.$disconnect();
      }
  } else {
      console.log("No local dev.db found.");
  }
}

main();
