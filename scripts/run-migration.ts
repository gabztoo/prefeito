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
    const migrationPath =
      process.argv[2] ?? "db/migrations/0000_bored_grandmaster.sql";
    const migrationSQL = readFileSync(migrationPath, "utf-8");

    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await pool.query("BEGIN");
    for (let i = 0; i < statements.length; i++) {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      await pool.query(statements[i]);
      console.log(`Statement ${i + 1} executed successfully`);
    }

    await pool.query("COMMIT");

    console.log("Migration completed!");
    await pool.end();
  } catch (e: any) {
    console.error("Migration failed:", e.message);
    await pool.end();
  }
}

runMigration();
