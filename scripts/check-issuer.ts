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
    'SELECT issuer FROM account WHERE "providerId" = $1 LIMIT 1',
    ["credential"]
  );
  console.log("Issuer:", result.rows[0]?.issuer);
  await pool.end();
}

check().catch((e) => console.error(e.message));
