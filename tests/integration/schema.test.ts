import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

describe("Database Schema", () => {
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

  it("should have citext extension", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_extension WHERE extname = 'citext'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have user table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'user'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have session table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'session'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have account table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'account'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have verification table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'verification'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have campaign table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have campaign_leader table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_leader'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have voter table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'voter'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have invitation table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'invitation'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have registration_rate_limit table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_rate_limit'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have audit_event table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_event'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have rateLimit table", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.tables WHERE table_name = 'rateLimit'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have unique constraint on campaign.slug", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_slug_unique' AND table_name = 'campaign'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have unique constraint on campaign_leader.campaignId, campaign_leader.leaderId", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_leader_campaignId_leaderId_unique' AND table_name = 'campaign_leader'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have unique constraint on campaign_leader.publicCode", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_leader_publicCode_unique' AND table_name = 'campaign_leader'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have unique constraint on voter.campaignId, voter.phone", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'voter_campaignId_phone_unique' AND table_name = 'voter'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have unique constraint on invitation.email for pending status", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invitation_email_pending_unique' AND table_name = 'invitation'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have foreign key from campaign.createdBy to user.id", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_createdBy_foreign' AND table_name = 'campaign'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have foreign key from campaign_leader.campaignId to campaign.id", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_leader_campaignId_foreign' AND table_name = 'campaign_leader'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have foreign key from campaign_leader.leaderId to user.id", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'campaign_leader_leaderId_foreign' AND table_name = 'campaign_leader'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have foreign key from voter.campaignLeaderId, voter.campaignId to campaign_leader.id, campaign_leader.campaignId", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'voter_campaignLeaderId_campaignId_foreign' AND table_name = 'voter'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have foreign key from invitation.userId to user.id", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invitation_userId_foreign' AND table_name = 'invitation'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have foreign key from invitation.invitedBy to user.id", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'invitation_invitedBy_foreign' AND table_name = 'invitation'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have foreign key from audit_event.actorId to user.id", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'audit_event_actorId_foreign' AND table_name = 'audit_event'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have index on campaign_leader.leaderId", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = 'campaign_leader_leaderId_idx' AND tablename = 'campaign_leader'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have index on campaign_leader.campaignId", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = 'campaign_leader_campaignId_idx' AND tablename = 'campaign_leader'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have index on voter.campaignLeaderId, voter.createdAt", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = 'voter_campaignLeaderId_createdAt_idx' AND tablename = 'voter'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have index on voter.campaignId, voter.createdAt", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = 'voter_campaignId_createdAt_idx' AND tablename = 'voter'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have index on voter.zone", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = 'voter_zone_idx' AND tablename = 'voter'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have index on voter.section", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = 'voter_section_idx' AND tablename = 'voter'`
    );
    expect(result.rows.length).toBe(1);
  });

  it("should have index on registration_rate_limit.expiresAt", async () => {
    const result = await db.execute(
      sql`SELECT 1 FROM pg_indexes WHERE indexname = 'registration_rate_limit_expiresAt_idx' AND tablename = 'registration_rate_limit'`
    );
    expect(result.rows.length).toBe(1);
  });
});