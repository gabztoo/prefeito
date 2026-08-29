import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { 
  inviteLeader, 
  acceptInvite, 
  completePasswordReset,
  getLockId,
  InvitationStatus
} from "@/lib/services/invitation";

describe("Invitation Integration", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  let adminId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });
    db = drizzle(pool);

    const adminResult = await db.execute(
      sql`SELECT id FROM "user" WHERE role = 'admin' LIMIT 1`
    );
    adminId = String(adminResult.rows[0]?.id || "");
    if (!adminId) {
      throw new Error("Integration tests require an admin user");
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.execute(
      sql`DELETE FROM invitation WHERE email = 'test_leader@prefeito.local'`
    );
    await db.execute(
      sql`DELETE FROM "user" WHERE email = 'test_leader@prefeito.local'`
    );
  });

  describe("inviteLeader", () => {
    it("should create a leader invitation", async () => {
      const result = await inviteLeader({
        firstName: "Test",
        lastName: "Leader",
        adminId,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.email).toBe("test_leader@prefeito.local");
        expect(result.data.status).toBe(InvitationStatus.PENDING);
      }
    });

    it("should be idempotent for same email", async () => {
      const result1 = await inviteLeader({
        firstName: "Test",
        lastName: "Leader",
        adminId,
      });

      const result2 = await inviteLeader({
        firstName: "Test",
        lastName: "Leader",
        adminId,
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
    });
  });

  describe("getLockId", () => {
    it("should generate consistent lock IDs", () => {
      const lockId1 = getLockId("user-123");
      const lockId2 = getLockId("user-123");
      expect(lockId1).toBe(lockId2);
    });

    it("should generate different lock IDs for different users", () => {
      const lockId1 = getLockId("user-123");
      const lockId2 = getLockId("user-456");
      expect(lockId1).not.toBe(lockId2);
    });
  });
});
