import { config } from "dotenv";
import { Pool } from "pg";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { user, account } from "@/db/schema";

config({ path: ".env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const db = drizzle(pool);

const adminEmail = "admin@prefeito.com";
const adminPassword = "admin123";

// Better Auth password hashing (scrypt with correct parameters)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password.normalize("NFKC"), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${key.toString("hex")}`;
}

async function seed() {
  console.log("🌱 Criando usuário admin...");

  // Check if admin already exists
  const existingUsers = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
  
  let userId: string;

  if (existingUsers.length > 0) {
    userId = existingUsers[0].id;
    console.log("✅ Usuário admin já existe:", adminEmail);
  } else {
    // Create user
    userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      name: "Administrador",
      email: adminEmail,
      emailVerified: true,
      role: "admin",
      banned: false,
    });
    console.log("✅ Usuário admin criado!");
  }

  // Delete existing credential account if any
  const existingAccounts = await db.select().from(account).where(eq(account.userId, userId)).limit(1);
  
  if (existingAccounts.length > 0) {
    await db.delete(account).where(eq(account.userId, userId));
    console.log("🗑️  Conta antiga removida");
  }

  // Create account with hashed password
  const accountRecordId = crypto.randomUUID();
  const hashedPassword = hashPassword(adminPassword);
  
  await db.insert(account).values({
    id: accountRecordId,
    accountId: userId, // Must match userId!
    providerId: "credential",
    issuer: "local:credential", // Required by Better Auth
    userId: userId,
    password: hashedPassword,
  });
  console.log("✅ Conta com senha hasheada criada!");

  console.log("📧 Email:", adminEmail);
  console.log("🔑 Senha:", adminPassword);
  console.log("📋 ID:", userId);
  
  await pool.end();
}

seed().catch(console.error);
