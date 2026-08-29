import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { 
  inviteLeader, 
  resendLeaderInvite, 
  acceptInvite, 
  completePasswordReset,
  getLockId,
  InvitationStatus
} from "@/lib/services/invitation";

describe("Invitation Integration", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL!,
    });
    db = drizzle(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await db.execute(sql`DELETE FROM invitation WHERE email LIKE '%@test.com'`);
    await db.execute(sql`DELETE FROM user WHERE email LIKE '%@test.com'`);
  });

  describe("inviteLeader", () => {
    it("should create a leader invitation", async () => {
      const result = await inviteLeader({
        name: "Test Leader",
        email: "test-leader@test.com",
        adminId: "admin-123",
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.email).toBe("test-leader@test.com");
        expect(result.data.status).toBe(InvitationStatus.PENDING);
      }
    });

    it("should be idempotent for same email", async () => {
      const result1 = await inviteLeader({
        name: "Test Leader",
        email: "test-leader@test.com",
        adminId: "admin-123",
      });

      const result2 = await inviteLeader({
        name: "Test Leader",
        email: "test-leader@test.com",
        adminId: "admin-123",
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