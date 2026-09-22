import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildVoterWorkbook } from "@/lib/voter-export";

describe("buildVoterWorkbook", () => {
  it("creates a readable workbook with voter details as text and dates formatted for Brazil", async () => {
    const buffer = await buildVoterWorkbook([
      {
        name: "=Nome de teste",
        motherName: "Maria",
        birthDate: "1990-02-03",
        phone: "01234567890",
        voterTitle: "001234567890",
        zone: "001",
        section: "0002",
        leaderName: "Líder",
        campaignName: "Campanha",
        createdAt: new Date("2026-01-02T12:30:00.000Z"),
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const worksheet = workbook.getWorksheet("Eleitores");

    expect(worksheet).toBeDefined();
    expect(worksheet?.getRow(1).values).toEqual([
      undefined,
      "Nome",
      "Nome da mãe",
      "Data de nascimento",
      "Telefone",
      "Título de eleitor",
      "Zona",
      "Seção",
      "Líder",
      "Campanha",
      "Data do cadastro",
    ]);
    expect(worksheet?.getRow(2).getCell(1).value).toBe("=Nome de teste");
    expect(worksheet?.getRow(2).getCell(1).type).not.toBe(ExcelJS.ValueType.Formula);
    expect(worksheet?.getRow(2).getCell(3).value).toBe("03/02/1990");
    expect(worksheet?.getRow(2).getCell(4).value).toBe("01234567890");
    expect(worksheet?.getRow(2).getCell(5).value).toBe("001234567890");
    expect(worksheet?.autoFilter).toBeDefined();
    expect(worksheet?.autoFilter).toBe("A1:J2");
    expect(worksheet?.views[0]?.state).toBe("frozen");
  });

  it("creates a workbook with headers when there are no voters", async () => {
    const buffer = await buildVoterWorkbook([]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);

    expect(workbook.getWorksheet("Eleitores")?.rowCount).toBe(1);
  });
});
