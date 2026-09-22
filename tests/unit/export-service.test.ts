import { beforeEach, describe, expect, it, vi } from "vitest";

const { listVotersMock, buildVoterWorkbookMock } = vi.hoisted(() => ({
  listVotersMock: vi.fn(),
  buildVoterWorkbookMock: vi.fn(),
}));

vi.mock("@/lib/services/voter", () => ({ listVoters: listVotersMock }));
vi.mock("@/lib/voter-export", () => ({ buildVoterWorkbook: buildVoterWorkbookMock }));

import { exportVotersXlsx } from "@/lib/services/export";

const voter = {
  id: "voter-1",
  name: "Ana",
  motherName: "Maria",
  birthDate: "1990-01-01",
  zone: "001",
  section: "002",
  phone: "11999999999",
  voterTitle: "001234567890",
  campaignId: "campaign-1",
  campaignLeaderId: "leader-link-1",
  leaderName: "Líder",
  campaignName: "Campanha",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("exportVotersXlsx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildVoterWorkbookMock.mockResolvedValue(Buffer.from("xlsx"));
  });

  it("uses the authorized voter listing with active filters and includes all result pages", async () => {
    listVotersMock.mockImplementation(async (_userId, _role, filters) => ({
      ok: true,
      data: {
        voters: filters.page === 1 ? [voter] : [{ ...voter, id: "voter-2" }],
        totalFiltered: 101,
        page: filters.page,
        limit: 100,
      },
    }));

    const result = await exportVotersXlsx("coordinator-1", "coordinator", {
      search: "Ana",
      zone: "001",
      section: "002",
    });

    expect(result).toMatchObject({ ok: true, count: 101 });
    expect(listVotersMock).toHaveBeenCalledTimes(2);
    expect(listVotersMock).toHaveBeenNthCalledWith(1, "coordinator-1", "coordinator", {
      search: "Ana",
      zone: "001",
      section: "002",
      page: 1,
      limit: 100,
    });
    expect(listVotersMock).toHaveBeenNthCalledWith(2, "coordinator-1", "coordinator", {
      search: "Ana",
      zone: "001",
      section: "002",
      page: 2,
      limit: 100,
    });
    expect(buildVoterWorkbookMock).toHaveBeenCalledWith([
      voter,
      { ...voter, id: "voter-2" },
    ]);
  });

  it("rejects roles that are not allowed to export", async () => {
    const result = await exportVotersXlsx("user-1", "guest", {});

    expect(result).toMatchObject({ ok: false, code: "FORBIDDEN" });
    expect(listVotersMock).not.toHaveBeenCalled();
    expect(buildVoterWorkbookMock).not.toHaveBeenCalled();
  });

  it("does not build a workbook when the record limit is exceeded", async () => {
    listVotersMock.mockResolvedValue({
      ok: true,
      data: { voters: [], totalFiltered: 100_001, page: 1, limit: 100 },
    });

    const result = await exportVotersXlsx("admin-1", "admin", {});

    expect(result).toMatchObject({ ok: false, code: "TOO_MANY_RECORDS" });
    expect(buildVoterWorkbookMock).not.toHaveBeenCalled();
  });
});
