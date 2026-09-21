import { describe, expect, it } from "vitest";
import { canEditVoter } from "@/lib/services/voter";

const base = {
  requesterId: "user-1",
  voterLeaderId: null as string | null,
  voterCampaignLeaderId: null as string | null,
  ownedLeaderIds: [] as string[],
  ownedCampaignLeaderIds: [] as string[],
};

describe("voter edit access", () => {
  it("lets an admin edit any voter", () => {
    expect(
      canEditVoter({
        ...base,
        role: "admin",
        voterLeaderId: "someone-else",
      })
    ).toBe(true);
  });

  it("lets a leader edit a voter linked to them", () => {
    expect(
      canEditVoter({
        ...base,
        role: "leader",
        ownedLeaderIds: ["user-1"],
        voterLeaderId: "user-1",
      })
    ).toBe(true);
  });

  it("lets a leader edit a voter linked through their active campaign link", () => {
    expect(
      canEditVoter({
        ...base,
        role: "leader",
        ownedCampaignLeaderIds: ["link-1"],
        voterCampaignLeaderId: "link-1",
      })
    ).toBe(true);
  });

  it("blocks a leader from editing another leader voter", () => {
    expect(
      canEditVoter({
        ...base,
        role: "leader",
        ownedLeaderIds: ["user-1"],
        ownedCampaignLeaderIds: ["link-1"],
        voterLeaderId: "user-2",
        voterCampaignLeaderId: "link-2",
      })
    ).toBe(false);
  });

  it("lets a coordinator edit a voter of a linked leader", () => {
    expect(
      canEditVoter({
        ...base,
        role: "coordinator",
        ownedLeaderIds: ["leader-1", "leader-2"],
        voterLeaderId: "leader-2",
      })
    ).toBe(true);
  });

  it("lets a coordinator edit a voter through a linked leader campaign link", () => {
    expect(
      canEditVoter({
        ...base,
        role: "coordinator",
        ownedCampaignLeaderIds: ["link-1"],
        voterCampaignLeaderId: "link-1",
      })
    ).toBe(true);
  });

  it("blocks a coordinator from editing a voter outside their leaders", () => {
    expect(
      canEditVoter({
        ...base,
        role: "coordinator",
        ownedLeaderIds: ["leader-1"],
        ownedCampaignLeaderIds: ["link-1"],
        voterLeaderId: "leader-9",
        voterCampaignLeaderId: "link-9",
      })
    ).toBe(false);
  });

  it("blocks a voter without a leader link for non-admins", () => {
    expect(
      canEditVoter({
        ...base,
        role: "leader",
        ownedLeaderIds: ["user-1"],
        ownedCampaignLeaderIds: ["link-1"],
      })
    ).toBe(false);
  });
});
