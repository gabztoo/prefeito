import { readFileSync } from "fs";
import { Pool } from "pg";
import crypto from "crypto";

const envContent = readFileSync(".env", "utf-8");
const lines = envContent.split("\n");
const dbLine = lines.find((l) => l.startsWith("DATABASE_URL"));
const dbUrl = dbLine?.split("=")[1]?.replace(/"/g, "").trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function test() {
  // Get password from account
  const result = await pool.query(
    'SELECT password FROM account WHERE "providerId" = $1 LIMIT 1',
    ["credential"]
  );
  const storedPassword = result.rows[0]?.password;
  console.log("Stored password (first 80):", storedPassword?.substring(0, 80));

  // Parse stored password (format: salt:hash)
  const parts = storedPassword?.split(":");
  if (parts?.length === 2) {
    const salt = parts[0];
    const storedHash = parts[1];
    console.log("Salt:", salt);
    console.log("Stored hash (first 40):", storedHash?.substring(0, 40));

    // Hash with same parameters as Better Auth
    const key = crypto.scryptSync("admin123".normalize("NFKC"), salt, 64, {
      N: 16384,
      r: 16,
      p: 1,
      maxmem: 128 * 16384 * 16 * 2,
    });
    const inputHash = key.toString("hex");
    console.log("Input hash (first 40):", inputHash.substring(0, 40));
    console.log("Hashes match:", storedHash === inputHash);
  } else {
    console.log("Password format unknown:", storedPassword?.substring(0, 30));
  }

  await pool.end();
}

test().catch((e) => console.error(e));
