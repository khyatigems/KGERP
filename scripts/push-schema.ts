import { createClient } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Simple env parser
const envPathLocal = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");
const envVars: Record<string, string> = {};

// Load .env first
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      envVars[match[1].trim()] = value;
    }
  });
}

// Override with .env.local
if (fs.existsSync(envPathLocal)) {
  const envContent = fs.readFileSync(envPathLocal, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      envVars[match[1].trim()] = value;
    }
  });
}

const url = envVars.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL not found in .env or .env.local");
  process.exit(1);
}

// Extract auth token if present in URL
const clientUrl = url.split("?")[0];
const authToken = new URLSearchParams(url.split("?")[1]).get("authToken") || undefined;

const client = createClient({
  url: clientUrl,
  authToken: authToken,
});

async function main() {
  console.log("Generating schema SQL...");
  
  try {
      // Run prisma migrate diff to get the SQL
      const sqlBuffer = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script");
      const sqlContent = sqlBuffer.toString("utf-8");
      
      console.log("Deploying schema to Turso...");
      
      // Split by semicolon, but handle comments and empty lines
      const statements = sqlContent
        .split(";")
        .map(s => s.trim())
        .filter(s => s.length > 0);
        
      console.log(`Found ${statements.length} statements to execute.`);
      
      for (const statement of statements) {
        // Skip comments if they are the only thing in the statement
        if (statement.startsWith("--") && !statement.includes("\n")) continue;
        
        try {
          await client.execute(statement);
          console.log("Executed statement.");
        } catch (innerE) {
             const errorMessage = innerE instanceof Error ? innerE.message : String(innerE);
             if (errorMessage.includes("already exists") || errorMessage.includes("SQLITE_ERROR")) {
                 console.log(`Skipping (likely exists): ${statement.substring(0, 30)}...`);
             } else {
                 console.error("Error executing statement:", innerE);
                 console.error("Statement was:", statement);
             }
        }
      }
      console.log("Schema push process finished.");
      
  } catch (e) {
      console.error("Failed to generate or execute SQL:", e);
      process.exit(1);
  }
}

main();
