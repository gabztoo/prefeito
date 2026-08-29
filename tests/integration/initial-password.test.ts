import { beforeAll, afterAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import {
  completeInitialPasswordChange,
  LEADER_DEFAULT_PASSWORD,
} from "@/lib/services/invitation";
import crypto from "crypto";

describe("Initial password change", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  let adminId: string;
  let fixtureUserId: string;
  let fixtureCampaignId: string;
  let fixtureLinkId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    db = drizzle(pool);

    const result = await db.execute(sql`
      SELECT id FROM "user" WHERE role = 'admin' LIMIT 1
    `);
    adminId = String(result.rows[0]?.id || "");

    if (!adminId) {
      throw new Error("Integration tests require an admin user");
    }
  });

  beforeEach(async () => {
    fixtureUserId = crypto.randomUUID();
    fixtureCampaignId = crypto.randomUUID();
    const fixtureEmail = `${fixtureUserId}@prefeito.local`;
    const fixtureSlug = `initial-password-${fixtureCampaignId}`;
    const fixtureCode = crypto.randomBytes(32).toString("base64url");
    fixtureLinkId = crypto.randomUUID();
    const passwordHash = await hashPassword(LEADER_DEFAULT_PASSWORD);

    await db.execute(sql`
      INSERT INTO "user" (
        "id", "name", "email", "username", "role", "emailVerified",
        "banned", "mustChangePassword"
      )
      VALUES (
        ${fixtureUserId}, 'Initial Password Leader', ${fixtureEmail},
        ${fixtureUserId}, 'leader', true, false, true
      )
    `);

    await db.execute(sql`
      INSERT INTO "account" (
        "id", "accountId", "providerId", "issuer", "userId", "password"
      )
      VALUES (
        ${crypto.randomUUID()}, ${fixtureUserId}, 'credential', 'local:credential',
        ${fixtureUserId}, ${passwordHash}
      )
    `);

    await db.execute(sql`
      INSERT INTO "campaign" ("id", "name", "slug", "status", "createdBy")
      VALUES (${fixtureCampaignId}, 'Initial Password Campaign', ${fixtureSlug}, 'open', ${adminId})
    `);

    await db.execute(sql`
      INSERT INTO "campaign_leader" ("id", "campaignId", "leaderId", "publicCode", "active")
      VALUES (${fixtureLinkId}, ${fixtureCampaignId}, ${fixtureUserId}, ${fixtureCode}, true)
    `);

    await db.execute(sql`
      INSERT INTO "invitation" (
        "id", "userId", "email", "status", "deliveryVersion", "invitedBy", "expiresAt"
      )
      VALUES (
        ${crypto.randomUUID()}, ${fixtureUserId}, ${fixtureEmail}, 'pending', 1,
        ${adminId}, NOW() + INTERVAL '48 hours'
      )
    `);
  });

  afterEach(async () => {
    await db.execute(sql`DELETE FROM "invitation" WHERE "userId" = ${fixtureUserId}`);
    await db.execute(sql`DELETE FROM "campaign_leader" WHERE "id" = ${fixtureLinkId}`);
    await db.execute(sql`DELETE FROM "campaign" WHERE "id" = ${fixtureCampaignId}`);
    await db.execute(sql`DELETE FROM "account" WHERE "userId" = ${fixtureUserId}`);
    await db.execute(sql`DELETE FROM "user" WHERE "id" = ${fixtureUserId}`);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("changes the credential and accepts the invitation atomically", async () => {
    const newPassword = "new-initial-password";

    const result = await completeInitialPasswordChange(fixtureUserId, newPassword);

    expect(result).toEqual({ ok: true, data: undefined });

    const state = await db.execute(sql`
      SELECT
        u."mustChangePassword",
        i."status" AS "invitationStatus",
        a."password"
      FROM "user" u
      INNER JOIN "invitation" i ON i."userId" = u."id"
      INNER JOIN "account" a ON a."userId" = u."id"
      WHERE u."id" = ${fixtureUserId}
    `);
    const row = state.rows[0] as {
      mustChangePassword: boolean;
      invitationStatus: string;
      password: string;
    };

    expect(row.mustChangePassword).toBe(false);
    expect(row.invitationStatus).toBe("accepted");
    expect(await verifyPassword({ hash: row.password, password: newPassword })).toBe(true);
    expect(await verifyPassword({ hash: row.password, password: LEADER_DEFAULT_PASSWORD })).toBe(false);
  });

  it("does not complete the change after a concurrent deactivation", async () => {
    const client = await pool.connect();
    let changePromise: ReturnType<typeof completeInitialPasswordChange> | undefined;

    try {
      await client.query("BEGIN");
      await client.query(
        'SELECT "id" FROM "campaign_leader" WHERE "id" = $1 FOR UPDATE',
        [fixtureLinkId]
      );
      const pidResult = await client.query("SELECT pg_backend_pid() AS pid");
      const lockHolderPid = Number(pidResult.rows[0].pid);

      changePromise = completeInitialPasswordChange(
        fixtureUserId,
        "new-initial-password"
      );

      let waitingForLinkLock = false;
      for (let attempt = 0; attempt < 200 && !waitingForLinkLock; attempt += 1) {
        const lockResult = await db.execute(sql`
          SELECT EXISTS (
            SELECT 1
            FROM pg_locks waiting
            INNER JOIN pg_locks holding
              ON holding.locktype = 'transactionid'
              AND holding.transactionid = waiting.transactionid
              AND holding.pid = ${lockHolderPid}
            INNER JOIN pg_stat_activity activity ON activity.pid = waiting.pid
            WHERE waiting.locktype = 'transactionid'
              AND waiting.granted = false
              AND activity.query ILIKE '%FOR UPDATE OF cl%'
          ) AS "waiting"
        `);
        waitingForLinkLock = Boolean(
          (lockResult.rows[0] as { waiting?: boolean }).waiting
        );

        if (!waitingForLinkLock) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      expect(waitingForLinkLock).toBe(true);

      await client.query(
        'UPDATE "user" SET "banned" = true, "banReason" = $1 WHERE "id" = $2',
        ["deactivated", fixtureUserId]
      );
      await client.query(
        'UPDATE "campaign_leader" SET "active" = false WHERE "id" = $1',
        [fixtureLinkId]
      );
      await client.query("COMMIT");

      const result = await changePromise;
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("FORBIDDEN");
      }

      const state = await db.execute(sql`
        SELECT
          u."mustChangePassword",
          i."status" AS "invitationStatus",
          a."password"
        FROM "user" u
        INNER JOIN "invitation" i ON i."userId" = u."id"
        INNER JOIN "account" a ON a."userId" = u."id"
        WHERE u."id" = ${fixtureUserId}
      `);
      const row = state.rows[0] as {
        mustChangePassword: boolean;
        invitationStatus: string;
        password: string;
      };
      expect(row.mustChangePassword).toBe(true);
      expect(row.invitationStatus).toBe("pending");
      expect(await verifyPassword({ hash: row.password, password: LEADER_DEFAULT_PASSWORD })).toBe(true);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      if (changePromise) {
        await changePromise.catch(() => undefined);
      }
    }
  });

  it("does not report success when the initial password was already changed", async () => {
    await db.execute(sql`
      UPDATE "user"
      SET "mustChangePassword" = false
      WHERE "id" = ${fixtureUserId}
    `);

    const result = await completeInitialPasswordChange(
      fixtureUserId,
      "new-initial-password"
    );

    expect(result).toEqual({
      ok: false,
      code: "VALIDATION_ERROR",
      message: "A senha inicial já foi alterada.",
    });
  });
});
