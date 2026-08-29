import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import {
  getCampaign,
  regenerateCampaignLeaderLink,
} from "@/lib/services/campaign";
import crypto from "crypto";

describe("Campaign leader link details", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;
  let fixtureCampaignId: string;
  let fixtureLeaderId: string;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    db = drizzle(pool);
  });

  beforeAll(async () => {
    const adminResult = await db.execute(sql`
      SELECT id FROM "user" WHERE role = 'admin' LIMIT 1
    `);
    const adminId = String(adminResult.rows[0]?.id || "");

    if (!adminId) {
      throw new Error("Integration tests require an admin user");
    }

    fixtureCampaignId = crypto.randomUUID();
    fixtureLeaderId = crypto.randomUUID();
    const fixtureEmail = `${fixtureLeaderId}@prefeito.local`;
    const fixtureSlug = `test-campaign-${fixtureCampaignId}`;
    const fixtureCode = crypto.randomBytes(32).toString("base64url");

    await db.execute(sql`
      INSERT INTO "user" ("id", "name", "email", "role", "emailVerified", "banned")
      VALUES (${fixtureLeaderId}, 'Test Leader', ${fixtureEmail}, 'leader', true, false)
    `);

    await db.execute(sql`
      INSERT INTO "campaign" ("id", "name", "slug", "status", "createdBy")
      VALUES (${fixtureCampaignId}, 'Test Campaign', ${fixtureSlug}, 'draft', ${adminId})
    `);

    await db.execute(sql`
      INSERT INTO "campaign_leader" ("campaignId", "leaderId", "publicCode", "active")
      VALUES (${fixtureCampaignId}, ${fixtureLeaderId}, ${fixtureCode}, true)
    `);
  });

  afterAll(async () => {
    await db.execute(sql`
      DELETE FROM "campaign_leader" WHERE "campaignId" = ${fixtureCampaignId}
    `);
    await db.execute(sql`
      DELETE FROM "campaign" WHERE "id" = ${fixtureCampaignId}
    `);
    await db.execute(sql`
      DELETE FROM "user" WHERE "id" = ${fixtureLeaderId}
    `);
    await pool.end();
  });

  it("returns the leader name and email with each campaign link", async () => {
    const adminResult = await db.execute(sql`
      SELECT "createdBy" AS "adminId"
      FROM "campaign"
      WHERE "id" = ${fixtureCampaignId}
    `);
    const adminId = String((adminResult.rows[0] as { adminId: string }).adminId);

    const result = await getCampaign(fixtureCampaignId, adminId, "admin");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.leaders).toHaveLength(1);
      expect(result.data.leaders[0]?.leaderName).toBe("Test Leader");
      expect(result.data.leaders[0]?.leaderEmail).toContain("@prefeito.local");
    }
  });

  it("does not reactivate a link after a concurrent leader deactivation", async () => {
    const adminResult = await db.execute(sql`
      SELECT "createdBy" AS "adminId"
      FROM "campaign"
      WHERE "id" = ${fixtureCampaignId}
    `);
    const adminId = String((adminResult.rows[0] as { adminId: string }).adminId);
    const linkResult = await db.execute(sql`
      SELECT "id" FROM "campaign_leader" WHERE "campaignId" = ${fixtureCampaignId}
    `);
    const linkId = String((linkResult.rows[0] as { id: string }).id);
    const client = await pool.connect();
    let regeneratePromise: ReturnType<typeof regenerateCampaignLeaderLink> | undefined;

    try {
      await client.query("BEGIN");
      await client.query(
        'SELECT "id" FROM "campaign_leader" WHERE "id" = $1 FOR UPDATE',
        [linkId]
      );
      const pidResult = await client.query("SELECT pg_backend_pid() AS pid");
      const lockHolderPid = Number(pidResult.rows[0].pid);

      regeneratePromise = regenerateCampaignLeaderLink(linkId, adminId);

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
              AND (
                activity.query ILIKE '%FOR UPDATE OF cl%'
                OR activity.query ILIKE '%UPDATE "campaign_leader"%'
              )
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
        ["deactivated", fixtureLeaderId]
      );
      await client.query(
        'UPDATE "campaign_leader" SET "active" = false WHERE "id" = $1',
        [linkId]
      );
      await client.query("COMMIT");

      const result = await regeneratePromise;
      expect(result.ok).toBe(true);

      const finalLinkResult = await db.execute(sql`
        SELECT "active" FROM "campaign_leader" WHERE "id" = ${linkId}
      `);
      expect((finalLinkResult.rows[0] as { active: boolean }).active).toBe(false);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
      if (regeneratePromise) {
        await regeneratePromise.catch(() => undefined);
      }
    }
  });
});
