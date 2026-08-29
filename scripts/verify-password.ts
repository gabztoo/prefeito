import { readFileSync } from "fs";
import { Pool } from "pg";
import { scrypt } from "crypto";

const envContent = readFileSync(".env", "utf-8");
const lines = envContent.split("\n");
const dbLine = lines.find((l) => l.startsWith("DATABASE_URL"));
const dbUrl = dbLine?.split("=")[1]?.replace(/"/g, "").trim();

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function verify() {
  const result = await pool.query(
    'SELECT password FROM account WHERE "providerId" = $1 LIMIT 1',
    ["credential"]
  );
  const storedPassword = result.rows[0]?.password;

  const [salt, storedKey] = storedPassword.split(":");

  console.log("Salt:", salt);
  console.log("Stored key length:", storedKey.length / 2, "bytes");

  // Verify with scrypt
  return new Promise<void>((resolve) => {
    scrypt(
      "admin123".normalize("NFKC"),
      salt,
      64,
      {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
      },
      (err, key) => {
        if (err) {
          console.error("Error:", err);
        } else {
          const computedKey = key.toString("hex");
          console.log("Computed key (first 40):", computedKey.substring(0, 40));
          console.log("Stored key (first 40):", storedKey.substring(0, 40));
          console.log("Match:", computedKey === storedKey);
        }
        pool.end();
        resolve();
      }
    );
  });
}

verify();
