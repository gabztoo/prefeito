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

async function fix() {
  await pool.query(
    'UPDATE account SET issuer = $1 WHERE "providerId" = $2',
    ["local:credential", "credential"]
  );
  console.log("Issuer updated");
  await pool.end();
}

fix().catch((e) => console.error(e.message));
