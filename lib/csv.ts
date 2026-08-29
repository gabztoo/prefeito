const CSV_BOM = "\ufeff";
const CSV_SEPARATOR = ";";
const FORMULA_CHARS = ["=", "+", "-", "@"] as const;

export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  const trimmed = str.trimStart();
  if (trimmed.length > 0) {
    const firstChar = trimmed[0];
    if (FORMULA_CHARS.includes(firstChar as typeof FORMULA_CHARS[number])) {
      str = "'" + str;
    }
  }

  str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (str.includes(CSV_SEPARATOR) || str.includes('"') || str.includes("\n")) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

export function formatDateForCsv(date: Date): string {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(date);
}

export function csvHeader(): string {
  return ["Nome", "Zona", "Seção", "Telefone", "Líder", "Campanha", "Data do cadastro"]
    .map(sanitizeCsvValue)
    .join(CSV_SEPARATOR);
}

export function csvRow(data: {
  name: string;
  zone: string;
  section: string;
  phone: string;
  leaderName: string;
  campaignName: string;
  createdAt: Date;
}): string {
  return [
    data.name,
    data.zone,
    data.section,
    data.phone,
    data.leaderName,
    data.campaignName,
    formatDateForCsv(data.createdAt),
  ]
    .map(sanitizeCsvValue)
    .join(CSV_SEPARATOR);
}

export async function* streamCsv(
  rows: AsyncIterable<{
    name: string;
    zone: string;
    section: string;
    phone: string;
    leaderName: string;
    campaignName: string;
    createdAt: Date;
  }>
): AsyncIterable<Uint8Array> {
  yield new TextEncoder().encode(CSV_BOM + csvHeader() + "\n");

  for await (const row of rows) {
    yield new TextEncoder().encode(csvRow(row) + "\n");
  }
}
