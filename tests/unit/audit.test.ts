import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, values } = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db/drizzle", () => ({
  db: { insert },
}));

vi.mock("@/db/schema", () => ({
  audit_event: {},
}));

import { logAuditEvent } from "@/lib/services/audit";

describe("persistent audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockReturnValue({ values });
  });

  it("persists the actor and entity without personal payload fields", async () => {
    await logAuditEvent({
      action: "update",
      entity: "voter",
      actorId: "admin-id",
      entityId: "voter-id",
      metadata: {
        operation: "edit",
        name: "Maria Silva",
        phone: "11999999999",
      },
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({
      actorId: "admin-id",
      action: "update",
      entityType: "voter",
      entityId: "voter-id",
    });
  });
});
