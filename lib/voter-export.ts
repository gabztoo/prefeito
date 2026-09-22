import ExcelJS from "exceljs";

export interface VoterExportRow {
  name: string;
  motherName: string;
  birthDate: string;
  phone: string;
  voterTitle: string | null;
  zone: string;
  section: string;
  leaderName: string | null;
  campaignName: string | null;
  createdAt: Date;
}

const HEADERS = [
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
];

function formatDate(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [, year, month, day] = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)!;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export async function buildVoterWorkbook(rows: readonly VoterExportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Prefeito";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Eleitores");
  worksheet.columns = [
    { width: 32 },
    { width: 32 },
    { width: 20 },
    { width: 18 },
    { width: 20 },
    { width: 12 },
    { width: 12 },
    { width: 28 },
    { width: 28 },
    { width: 20 },
  ];
  worksheet.addRow(HEADERS);
  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    worksheet.addRow([
      row.name,
      row.motherName,
      formatDate(row.birthDate),
      row.phone,
      row.voterTitle ?? "",
      row.zone,
      row.section,
      row.leaderName ?? "",
      row.campaignName ?? "",
      formatDate(row.createdAt),
    ]);
  }
  worksheet.autoFilter = { from: "A1", to: `J${rows.length + 1}` };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
