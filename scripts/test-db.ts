import { readFileSync } from "fs";
import { Pool } from "pg";

const envContent = readFileSync(".env", "utf-8");
const lines = envContent.split("\n");
const dbLine = lines.find((l) => l.startsWith("DATABASE_URL"));
const dbUrl = dbLine?.split("=")[1]?.replace(/"/g, "").trim();

console.log("DB URL found:", !!dbUrl);
console.log("DB URL:", dbUrl?.substring(0, 50) + "...");

if (dbUrl) {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });
  pool
    .query("SELECT 1 as test")
    .then((r) => {
      console.log("DB connected!", r.rows);
      return pool.end();
    })
    .catch((e) => {
      console.error("DB error:", e.message);
      pool.end();
    });
}
