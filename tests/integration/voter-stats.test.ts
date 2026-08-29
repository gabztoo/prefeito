import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { getVoterStats } from "@/lib/services/voter";
import crypto from "crypto";

describe("Voter statistics", () => {
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
    const fixtureSlug = `stats-campaign-${fixtureCampaignId}`;
    const fixtureCode = crypto.randomBytes(32).toString("base64url");

    await db.execute(sql`
      INSERT INTO "user" ("id", "name", "email", "role", "emailVerified", "banned")
      VALUES (${fixtureLeaderId}, 'Stats Test Leader', ${fixtureEmail}, 'leader', true, false)
    `);

    await db.execute(sql`
      INSERT INTO "campaign" ("id", "name", "slug", "status", "createdBy")
      VALUES (${fixtureCampaignId}, 'Stats Test Campaign', ${fixtureSlug}, 'open', ${adminId})
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

  it("includes active campaigns with no voters in leader statistics", async () => {
    const stats = await getVoterStats(fixtureLeaderId, "leader");

    expect(stats.ok).toBe(true);
    if (stats.ok) {
      expect(stats.data.byCampaign).toEqual([
        {
          campaignId: fixtureCampaignId,
          campaignName: "Stats Test Campaign",
          total: 0,
        },
      ]);
      expect(stats.data.grandTotal).toBe(0);
    }
  });
});
