import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fix() {
  console.log("🔧 Adicionando colunas faltantes...");
  
  await pool.query(`
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" text;
    ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banExpires" timestamp;
    ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
    ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "activeOrganizationId" text;
    ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "impersonatedBy" text;
  `);
  
  console.log("✅ Colunas adicionadas com sucesso!");
  await pool.end();
}

fix().catch(console.error);
