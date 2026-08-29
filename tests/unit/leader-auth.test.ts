import { describe, expect, it } from "vitest";
import {
  LEADER_DEFAULT_PASSWORD,
  getLeaderProvisioningState,
  getLeaderUsername,
} from "../../lib/services/invitation";

describe("leader authentication provisioning", () => {
  it("derives the username from the leader name", () => {
    expect(getLeaderUsername("João", "da Silva")).toBe("joao_da_silva");
  });

  it("allows the leader to authenticate before the required password change", () => {
    expect(LEADER_DEFAULT_PASSWORD).toBe("12345678");
    expect(getLeaderProvisioningState()).toEqual({
      banned: false,
      banReason: null,
      mustChangePassword: true,
    });
  });
});
