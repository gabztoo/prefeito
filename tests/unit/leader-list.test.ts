import { describe, expect, it } from "vitest";
import {
  getLeaderInvitationEmails,
  getLeaderInvitationStatus,
} from "@/lib/services/invitation";

describe("Leader invitation listing", () => {
  it("uses every leader email when loading invitation statuses", () => {
    expect(
      getLeaderInvitationEmails([
        { email: "first@prefeito.local" },
        { email: "second@prefeito.local" },
      ])
    ).toEqual(["first@prefeito.local", "second@prefeito.local"]);
  });

  it("shows an accepted invitation as accepted", () => {
    expect(
      getLeaderInvitationStatus("second@prefeito.local", [
        { email: "first@prefeito.local", status: "pending" },
        { email: "second@prefeito.local", status: "accepted" },
      ])
    ).toBe("accepted");
  });
});
