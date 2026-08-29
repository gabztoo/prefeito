import { readFileSync } from "fs";
import { Pool } from "pg";

const envContent = readFileSync(".env", "utf-8");
const lines = envContent.split("\n");
const dbLine = lines.find((l) => l.startsWith("DATABASE_URL"));
const dbUrl = dbLine?.split("=")[1]?.replace(/"/g, "").trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function runMigration() {
  try {
    const migrationSQL = readFileSync(
      "db/migrations/0000_bored_grandmaster.sql",
      "utf-8"
    );

    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      try {
        await pool.query(statement);
        console.log(`Statement ${i + 1} executed successfully`);
      } catch (e: any) {
        console.error(`Statement ${i + 1} failed:`, e.message);
      }
    }

    console.log("Migration completed!");
    await pool.end();
  } catch (e: any) {
    console.error("Migration failed:", e.message);
    await pool.end();
  }
}

runMigration();
