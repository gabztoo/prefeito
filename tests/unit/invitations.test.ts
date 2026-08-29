import { describe, expect, it } from "vitest";
import {
  getLeaderInvitationEmails,
  getLeaderProvisioningState,
  getLeaderUsername,
  getLockId,
  InvitationStatus,
} from "@/lib/services/invitation";

describe("Invitation helpers", () => {
  it("generates a normalized username from the leader name", () => {
    expect(getLeaderUsername("João", "da Silva")).toBe("joao_da_silva");
  });

  it("provisions leaders as active users that must change password", () => {
    expect(getLeaderProvisioningState()).toEqual({
      banned: false,
      banReason: null,
      mustChangePassword: true,
    });
  });

  it("uses every leader email when loading invitation statuses", () => {
    expect(
      getLeaderInvitationEmails([
        { email: "first@prefeito.local" },
        { email: "second@prefeito.local" },
      ])
    ).toEqual(["first@prefeito.local", "second@prefeito.local"]);
  });

  it("generates stable lock IDs for a user", () => {
    expect(getLockId("user-123")).toBe(getLockId("user-123"));
    expect(getLockId("user-123")).not.toBe(getLockId("user-456"));
  });

  it("keeps the invitation status values stable", () => {
    expect(InvitationStatus.PENDING).toBe("pending");
    expect(InvitationStatus.ACCEPTED).toBe("accepted");
    expect(InvitationStatus.REVOKED).toBe("revoked");
  });
});
