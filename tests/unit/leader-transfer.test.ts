import { describe, expect, it } from "vitest";
import { getLeaderTransferValidationError } from "@/lib/services/invitation";

describe("leader transfer validation", () => {
  it("allows linking a coordinator user to an existing coordinator", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "leader-1",
        targetRole: "coordinator",
        coordinatorId: "coordinator-1",
        coordinator: { role: "coordinator", banned: false },
        dependentLeaderCount: 0,
      })
    ).toBeNull();
  });

  it("allows keeping the user without a coordinator", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "leader-1",
        targetRole: "coordinator",
        coordinatorId: null,
      })
    ).toBeNull();
  });

  it("blocks transferring an administrator", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "admin-1",
        targetRole: "admin",
        coordinatorId: "coordinator-1",
        coordinator: { role: "coordinator", banned: false },
      })
    ).toBe("Não é possível transferir um administrador para líder.");
  });

  it("blocks linking a user to itself", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "user-1",
        targetRole: "coordinator",
        coordinatorId: "user-1",
        coordinator: { role: "coordinator", banned: false },
      })
    ).toBe("O usuário não pode ser vinculado a si mesmo.");
  });

  it("blocks a missing coordinator", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "leader-1",
        targetRole: "leader",
        coordinatorId: "missing",
        coordinator: null,
      })
    ).toBe("Coordenador responsável não encontrado.");
  });

  it("blocks a non-coordinator responsible", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "leader-1",
        targetRole: "leader",
        coordinatorId: "leader-2",
        coordinator: { role: "leader", banned: false },
      })
    ).toBe("O responsável selecionado não é um coordenador.");
  });

  it("blocks a banned coordinator", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "leader-1",
        targetRole: "leader",
        coordinatorId: "coordinator-1",
        coordinator: { role: "coordinator", banned: true },
      })
    ).toBe("O coordenador selecionado está desativado.");
  });

  it("blocks demoting a coordinator that still has leaders", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "coordinator-1",
        targetRole: "coordinator",
        coordinatorId: "coordinator-2",
        coordinator: { role: "coordinator", banned: false },
        dependentLeaderCount: 3,
      })
    ).toBe(
      "Este coordenador possui líderes vinculados. Transfira os líderes antes de alterar o papel."
    );
  });

  it("blocks demoting a coordinator with leaders even without a new coordinator", () => {
    expect(
      getLeaderTransferValidationError({
        targetId: "coordinator-1",
        targetRole: "coordinator",
        coordinatorId: null,
        dependentLeaderCount: 1,
      })
    ).toBe(
      "Este coordenador possui líderes vinculados. Transfira os líderes antes de alterar o papel."
    );
  });
});
