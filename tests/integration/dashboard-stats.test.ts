import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { getDashboardStats } from "@/lib/services/dashboard";

describe("Dashboard statistics", () => {
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

  it("returns the admin dashboard totals", async () => {
    const result = await db.execute(sql`
      SELECT id FROM "user" WHERE role = 'admin' LIMIT 1
    `);
    const adminId = String((result.rows[0] as { id?: string } | undefined)?.id || "");

    expect(adminId).toBeTruthy();

    const stats = await getDashboardStats(adminId, "admin");

    expect(stats.ok).toBe(true);
    if (stats.ok) {
      expect(stats.data.totalVoters).toBeGreaterThanOrEqual(0);
      expect(stats.data.activeCampaigns).toBeGreaterThanOrEqual(0);
      expect(stats.data.activeLeaders).toBeGreaterThanOrEqual(0);
      expect(stats.data.recentVoters).toBeGreaterThanOrEqual(0);
      expect(stats.data.pendingInvitations).toBeGreaterThanOrEqual(0);
      expect(stats.data.draftCampaigns).toBeGreaterThanOrEqual(0);
      expect(stats.data.campaignsWithoutLeaders).toBeGreaterThanOrEqual(0);
      expect(stats.data.campaigns).toBeInstanceOf(Array);
    }
  });
});
