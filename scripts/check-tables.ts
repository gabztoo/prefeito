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

async function test() {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log("Tables:", result.rows.map((r: any) => r.table_name));

    await pool.end();
  } catch (e: any) {
    console.error("Error:", e.message);
    await pool.end();
  }
}

test();
