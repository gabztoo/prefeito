import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { getCampaign } from "@/lib/services/campaign";

describe("Campaign leader link details", () => {
  let pool: Pool;
  let db: ReturnType<typeof drizzle>;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    db = drizzle(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("returns the leader name and email with each campaign link", async () => {
    const fixture = await db.execute(sql`
      SELECT c.id AS "campaignId", c."createdBy" AS "adminId"
      FROM campaign c
      INNER JOIN campaign_leader cl ON cl."campaignId" = c.id
      INNER JOIN "user" u ON u.id = cl."leaderId"
      WHERE u.name IS NOT NULL
      LIMIT 1
    `);
    const campaign = fixture.rows[0] as
      | { campaignId: string; adminId: string }
      | undefined;

    expect(campaign).toBeDefined();
    if (!campaign) return;

    const result = await getCampaign(campaign.campaignId, campaign.adminId, "admin");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.leaders[0]?.leaderName).toBeTruthy();
      expect(result.data.leaders[0]?.leaderEmail).toContain("@");
    }
  });
});
