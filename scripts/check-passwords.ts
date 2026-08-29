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
  try {
    // Get all accounts with credential provider
    const accounts = await pool.query(
      'SELECT id, "accountId", "providerId", issuer, password FROM account WHERE "providerId" = $1',
      ["credential"]
    );

    console.log("Credential accounts:");
    for (const account of accounts.rows) {
      const password = account.password;
      const isHashed = password && password.includes(":") && password.length > 50;
      console.log(`  ${account.accountId}: ${isHashed ? "HASHED" : "PLAIN TEXT"}`);
    }

    await pool.end();
  } catch (e: any) {
    console.error("Error:", e.message);
    await pool.end();
  }
}

check();
