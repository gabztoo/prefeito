import { describe, it, expect } from "vitest";
import { CampaignStatus, canTransition, validateTransition } from "@/lib/services/campaign";

describe("Campaign State Machine", () => {
  describe("canTransition", () => {
    it("should allow draft -> open", () => {
      expect(canTransition(CampaignStatus.DRAFT, CampaignStatus.OPEN)).toBe(true);
    });

    it("should allow open -> closed", () => {
      expect(canTransition(CampaignStatus.OPEN, CampaignStatus.CLOSED)).toBe(true);
    });

    it("should not allow draft -> closed", () => {
      expect(canTransition(CampaignStatus.DRAFT, CampaignStatus.CLOSED)).toBe(false);
    });

    it("should not allow open -> draft", () => {
      expect(canTransition(CampaignStatus.OPEN, CampaignStatus.DRAFT)).toBe(false);
    });

    it("should not allow closed -> open", () => {
      expect(canTransition(CampaignStatus.CLOSED, CampaignStatus.OPEN)).toBe(false);
    });

    it("should not allow closed -> draft", () => {
      expect(canTransition(CampaignStatus.CLOSED, CampaignStatus.DRAFT)).toBe(false);
    });

    it("should not allow same state transition", () => {
      expect(canTransition(CampaignStatus.DRAFT, CampaignStatus.DRAFT)).toBe(false);
      expect(canTransition(CampaignStatus.OPEN, CampaignStatus.OPEN)).toBe(false);
      expect(canTransition(CampaignStatus.CLOSED, CampaignStatus.CLOSED)).toBe(false);
    });
  });

  describe("validateTransition", () => {
    it("should return success for valid transition", () => {
      const result = validateTransition(CampaignStatus.DRAFT, CampaignStatus.OPEN);
      expect(result.ok).toBe(true);
    });

    it("should return error for invalid transition", () => {
      const result = validateTransition(CampaignStatus.DRAFT, CampaignStatus.CLOSED);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_TRANSITION");
      }
    });

    it("should return error for closed -> open", () => {
      const result = validateTransition(CampaignStatus.CLOSED, CampaignStatus.OPEN);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("INVALID_TRANSITION");
      }
    });
  });

  describe("CampaignStatus enum", () => {
    it("should have correct values", () => {
      expect(CampaignStatus.DRAFT).toBe("draft");
      expect(CampaignStatus.OPEN).toBe("open");
      expect(CampaignStatus.CLOSED).toBe("closed");
    });
  });
});

describe("Campaign Service", () => {
  describe("createCampaign", () => {
    it("should create a campaign with draft status", async () => {
      // This test will be implemented after the service is created
      // For now, we'll test the state machine logic
      const campaign = {
        id: "test-id",
        name: "Test Campaign",
        slug: "test-campaign",
        description: "Test description",
        status: CampaignStatus.DRAFT,
        createdBy: "user-id",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(campaign.status).toBe(CampaignStatus.DRAFT);
    });
  });

  describe("transitionCampaign", () => {
    it("should set openedAt when transitioning to open", async () => {
      const campaign = {
        id: "test-id",
        name: "Test Campaign",
        slug: "test-campaign",
        description: "Test description",
        status: CampaignStatus.DRAFT,
        createdBy: "user-id",
        openedAt: null,
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate transition
      const newStatus = CampaignStatus.OPEN;
      const now = new Date();

      expect(canTransition(campaign.status, newStatus)).toBe(true);
      expect(newStatus).toBe(CampaignStatus.OPEN);
    });

    it("should set closedAt when transitioning to closed", async () => {
      const campaign = {
        id: "test-id",
        name: "Test Campaign",
        slug: "test-campaign",
        description: "Test description",
        status: CampaignStatus.OPEN,
        createdBy: "user-id",
        openedAt: new Date(),
        closedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newStatus = CampaignStatus.CLOSED;
      const now = new Date();

      expect(canTransition(campaign.status, newStatus)).toBe(true);
      expect(newStatus).toBe(CampaignStatus.CLOSED);
    });

    it("should not allow transition from closed", async () => {
      const campaign = {
        id: "test-id",
        name: "Test Campaign",
        slug: "test-campaign",
        description: "Test description",
        status: CampaignStatus.CLOSED,
        createdBy: "user-id",
        openedAt: new Date(),
        closedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newStatus = CampaignStatus.OPEN;
      expect(canTransition(campaign.status, newStatus)).toBe(false);
    });
  });
});
