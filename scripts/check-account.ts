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
  // Check user
  const userResult = await pool.query(
    'SELECT id, email, role FROM "user" WHERE email = $1',
    ["admin@prefeito.com"]
  );
  console.log("User:", userResult.rows);

  // Check account
  const accountResult = await pool.query(
    'SELECT id, "accountId", "providerId", "userId", password FROM account WHERE "providerId" = $1',
    ["credential"]
  );
  console.log("Accounts:", accountResult.rows);

  // Check if user_id matches
  if (userResult.rows.length > 0 && accountResult.rows.length > 0) {
    const userId = userResult.rows[0].id;
    const accountUserId = accountResult.rows[0].userId;
    console.log("User ID:", userId);
    console.log("Account User ID:", accountUserId);
    console.log("IDs match:", userId === accountUserId);
  }

  await pool.end();
}

check().catch((e) => console.error(e));
