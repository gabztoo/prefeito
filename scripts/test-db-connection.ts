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
    const result = await pool.query("SELECT 1 as test");
    console.log("DB connected:", result.rows[0]);

    // Try to query the voter table
    const voterResult = await pool.query("SELECT COUNT(*) as count FROM voter");
    console.log("Voter count:", voterResult.rows[0]);

    await pool.end();
  } catch (e: any) {
    console.error("Error:", e.message);
    await pool.end();
  }
}

test();
