import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  databaseResults: [] as unknown[][],
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
}));

function createSelectMock() {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(async () => mocks.databaseResults.shift() ?? []),
      })),
    })),
  };
}

vi.mock("@/db/drizzle", () => ({
  db: {
    select: vi.fn(createSelectMock),
    transaction: vi.fn(async (callback) =>
      callback({
        execute: vi.fn(async () => undefined),
        select: vi.fn(createSelectMock),
      })
    ),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      requestPasswordReset: mocks.requestPasswordReset,
      resetPassword: mocks.resetPassword,
    },
  },
}));

import {
  completePasswordReset,
  requestPasswordReset,
} from "@/app/esqueci-senha/actions";

describe("Fluxo de recuperação de senha", () => {
  beforeEach(() => {
    mocks.databaseResults.length = 0;
    mocks.requestPasswordReset.mockReset();
    mocks.resetPassword.mockReset();
  });

  it("retorna o mesmo sucesso neutro para contas desconhecidas, pendentes, ativas e banidas", async () => {
    mocks.databaseResults.push(
      [],
      [
        {
          id: "pending-user",
          banned: false,
          banReason: null,
        },
      ],
      [{ id: "pending-invitation" }],
      [
        {
          id: "active-user",
          banned: false,
          banReason: null,
        },
      ],
      [],
      [
        {
          id: "banned-user",
          banned: true,
          banReason: "manual-ban",
        },
      ]
    );

    const unknownResult = await requestPasswordReset("desconhecido@example.com");
    const pendingInviteResult = await requestPasswordReset("convite@example.com");
    const activeResult = await requestPasswordReset("ativo@example.com");
    const bannedResult = await requestPasswordReset("bloqueado@example.com");

    expect(unknownResult).toEqual({ ok: true, data: undefined });
    expect(pendingInviteResult).toEqual(unknownResult);
    expect(activeResult).toEqual(unknownResult);
    expect(bannedResult).toEqual(unknownResult);
    expect(mocks.requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["menos de 12 caracteres", "a".repeat(11)],
    ["mais de 128 caracteres", "a".repeat(129)],
  ])("rejeita senha com %s", async (_description, newPassword) => {
    const result = await completePasswordReset({
      token: "token-de-teste",
      newPassword,
    });

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it("trata uma entrada ausente da action sem lançar exceção", async () => {
    const result = await completePasswordReset(
      undefined as unknown as { token: string; newPassword: string }
    );

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });

  it("só chama o reset do Better Auth após reler o token válido", async () => {
    mocks.databaseResults.push(
      [{ value: "user-1" }],
      [{ value: "user-1" }],
      [{ id: "user-1" }]
    );

    const result = await completePasswordReset({
      token: "token-de-teste",
      newPassword: "senha-segura-com-12",
    });

    expect(result).toEqual({ ok: true, data: undefined });
    expect(mocks.resetPassword).toHaveBeenCalledWith({
      body: {
        token: "token-de-teste",
        newPassword: "senha-segura-com-12",
      },
    });
  });
});
