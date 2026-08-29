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

async function check() {
  const result = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
    ["session"]
  );
  console.log(
    "Session columns:",
    result.rows.map((r: any) => r.column_name)
  );
  await pool.end();
}

check().catch((e) => console.error(e.message));
