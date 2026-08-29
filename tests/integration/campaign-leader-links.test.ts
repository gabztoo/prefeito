import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { getCampaign } from "@/lib/services/campaign";
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
});
