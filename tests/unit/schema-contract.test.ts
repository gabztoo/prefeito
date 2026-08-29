import { describe, it, expect } from "vitest";
import {
  user,
  session,
  account,
  verification,
  campaign,
  campaign_leader,
  voter,
  invitation,
  registration_rate_limit,
  audit_event,
  rateLimit,
} from "../../db/schema";

describe("Schema Contract", () => {
  it("should have user table with correct columns", () => {
    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.emailVerified).toBeDefined();
    expect(user.image).toBeDefined();
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  it("should have session table with correct columns", () => {
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.expiresAt).toBeDefined();
    expect(session.token).toBeDefined();
    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
    expect(session.ipAddress).toBeDefined();
    expect(session.userAgent).toBeDefined();
    expect(session.userId).toBeDefined();
  });

  it("should have account table with correct columns", () => {
    expect(account).toBeDefined();
    expect(account.id).toBeDefined();
    expect(account.accountId).toBeDefined();
    expect(account.providerId).toBeDefined();
    expect(account.userId).toBeDefined();
    expect(account.accessToken).toBeDefined();
    expect(account.refreshToken).toBeDefined();
    expect(account.idToken).toBeDefined();
    expect(account.accessTokenExpiresAt).toBeDefined();
    expect(account.refreshTokenExpiresAt).toBeDefined();
    expect(account.scope).toBeDefined();
    expect(account.password).toBeDefined();
    expect(account.createdAt).toBeDefined();
    expect(account.updatedAt).toBeDefined();
  });

  it("should have verification table with correct columns", () => {
    expect(verification).toBeDefined();
    expect(verification.id).toBeDefined();
    expect(verification.identifier).toBeDefined();
    expect(verification.value).toBeDefined();
    expect(verification.expiresAt).toBeDefined();
    expect(verification.createdAt).toBeDefined();
    expect(verification.updatedAt).toBeDefined();
  });

  it("should have campaign table with correct columns", () => {
    expect(campaign).toBeDefined();
    expect(campaign.id).toBeDefined();
    expect(campaign.name).toBeDefined();
    expect(campaign.slug).toBeDefined();
    expect(campaign.description).toBeDefined();
    expect(campaign.status).toBeDefined();
    expect(campaign.createdBy).toBeDefined();
    expect(campaign.openedAt).toBeDefined();
    expect(campaign.closedAt).toBeDefined();
    expect(campaign.createdAt).toBeDefined();
    expect(campaign.updatedAt).toBeDefined();
  });

  it("should have campaign_leader table with correct columns", () => {
    expect(campaign_leader).toBeDefined();
    expect(campaign_leader.id).toBeDefined();
    expect(campaign_leader.campaignId).toBeDefined();
    expect(campaign_leader.leaderId).toBeDefined();
    expect(campaign_leader.publicCode).toBeDefined();
    expect(campaign_leader.active).toBeDefined();
    expect(campaign_leader.createdAt).toBeDefined();
    expect(campaign_leader.updatedAt).toBeDefined();
  });

  it("should have voter table with correct columns", () => {
    expect(voter).toBeDefined();
    expect(voter.id).toBeDefined();
    expect(voter.campaignId).toBeDefined();
    expect(voter.campaignLeaderId).toBeDefined();
    expect(voter.name).toBeDefined();
    expect(voter.zone).toBeDefined();
    expect(voter.section).toBeDefined();
    expect(voter.phone).toBeDefined();
    expect(voter.createdAt).toBeDefined();
    expect(voter.updatedAt).toBeDefined();
  });

  it("should have invitation table with correct columns", () => {
    expect(invitation).toBeDefined();
    expect(invitation.id).toBeDefined();
    expect(invitation.userId).toBeDefined();
    expect(invitation.email).toBeDefined();
    expect(invitation.status).toBeDefined();
    expect(invitation.deliveryVersion).toBeDefined();
    expect(invitation.invitedBy).toBeDefined();
    expect(invitation.expiresAt).toBeDefined();
    expect(invitation.acceptedAt).toBeDefined();
    expect(invitation.revokedAt).toBeDefined();
    expect(invitation.createdAt).toBeDefined();
    expect(invitation.updatedAt).toBeDefined();
  });

  it("should have registration_rate_limit table with correct columns", () => {
    expect(registration_rate_limit).toBeDefined();
    expect(registration_rate_limit.bucketHash).toBeDefined();
    expect(registration_rate_limit.count).toBeDefined();
    expect(registration_rate_limit.expiresAt).toBeDefined();
    expect(registration_rate_limit.createdAt).toBeDefined();
    expect(registration_rate_limit.updatedAt).toBeDefined();
  });

  it("should have audit_event table with correct columns", () => {
    expect(audit_event).toBeDefined();
    expect(audit_event.id).toBeDefined();
    expect(audit_event.actorId).toBeDefined();
    expect(audit_event.action).toBeDefined();
    expect(audit_event.entityType).toBeDefined();
    expect(audit_event.entityId).toBeDefined();
    expect(audit_event.createdAt).toBeDefined();
  });

  it("should have rateLimit table with correct columns", () => {
    expect(rateLimit).toBeDefined();
    expect(rateLimit.id).toBeDefined();
    expect(rateLimit.key).toBeDefined();
    expect(rateLimit.count).toBeDefined();
    expect(rateLimit.lastRequest).toBeDefined();
  });
});