import { db } from "@/db/drizzle";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const MAX_EXPORT_RECORDS = 100_000;

export type ExportFilters = {
  campaignId?: string;
  leaderId?: string;
  zone?: string;
  section?: string;
};

export type ExportResult =
  | { ok: true; stream: ReadableStream<Uint8Array>; count: number }
  | { ok: false; code: "TOO_MANY_RECORDS" | "FORBIDDEN" | "INTERNAL_ERROR"; message: string };

export async function exportCsv(
  userId: string,
  role: string,
  filters: ExportFilters
): Promise<ExportResult> {
  try {
    const pool = db.$client as Pool;

    const scopeConditions: string[] = [];
    const params: (string | string[] | undefined)[] = [];
    let paramIndex = 1;

    if (role === "leader") {
      const leaderLinks = await db
        .select({ id: sql<string>`"id"` })
        .from(sql`campaign_leader`)
        .where(sql`"leaderId" = ${userId} AND "active" = true`);

      if (leaderLinks.length === 0) {
        return {
          ok: true,
          stream: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
          count: 0,
        };
      }

      const leaderLinkIds = leaderLinks.map((l) => l.id);
      scopeConditions.push(`v."campaignLeaderId" = ANY($${paramIndex}::uuid[])`);
      params.push(leaderLinkIds);
      paramIndex++;
    }

    if (filters.campaignId) {
      scopeConditions.push(`v."campaignId" = $${paramIndex}`);
      params.push(filters.campaignId);
      paramIndex++;
    }

    if (filters.leaderId) {
      scopeConditions.push(`v."campaignLeaderId" = $${paramIndex}`);
      params.push(filters.leaderId);
      paramIndex++;
    }

    if (filters.zone) {
      scopeConditions.push(`v.zone = $${paramIndex}`);
      params.push(filters.zone);
      paramIndex++;
    }

    if (filters.section) {
      scopeConditions.push(`v.section = $${paramIndex}`);
      params.push(filters.section);
      paramIndex++;
    }

    const whereClause = scopeConditions.length > 0
      ? `WHERE ${scopeConditions.join(" AND ")}`
      : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM voter v ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0]?.count || "0", 10);

    if (totalCount > MAX_EXPORT_RECORDS) {
      return {
        ok: false,
        code: "TOO_MANY_RECORDS",
        message: `Limite de ${MAX_EXPORT_RECORDS.toLocaleString("pt-BR")} registros excedido. Filtre os dados para reduzir o volume.`,
      };
    }

    const query = `
      SELECT
        v."name",
        v."motherName",
        v."zone",
        v."section",
        v."phone",
        u."name" as leader_name,
        c."name" as campaign_name,
        v."createdAt"
      FROM voter v
      INNER JOIN campaign_leader cl ON v."campaignLeaderId" = cl."id"
      INNER JOIN "user" u ON cl."leaderId" = u."id"
      INNER JOIN campaign c ON v."campaignId" = c."id"
      ${whereClause}
      ORDER BY v."createdAt" DESC
    `;

    const BOM = "\ufeff";
    const HEADER = "Nome;Nome da Mãe;Zona;Seção;Telefone;Líder;Campanha;Data do cadastro\n";
    const FORMULA_CHARS = ["=", "+", "-", "@"] as const;

    function sanitizeValue(value: unknown): string {
      if (value === null || value === undefined) return "";

      let str = String(value);

      const trimmed = str.trimStart();
      if (trimmed.length > 0) {
        const firstChar = trimmed[0];
        if (FORMULA_CHARS.includes(firstChar as typeof FORMULA_CHARS[number])) {
          str = "'" + str;
        }
      }

      str = str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

      if (str.includes(";") || str.includes('"') || str.includes("\n")) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }

      return str;
    }

    function formatDate(date: Date): string {
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    const result = await pool.query(query, params);
    const rows = result.rows;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(BOM + HEADER));

        for (const row of rows) {
          const [name, motherName, zone, section, phone, leaderName, campaignName, createdAt] = row;

          const csvLine = [
            sanitizeValue(name),
            sanitizeValue(motherName),
            sanitizeValue(zone),
            sanitizeValue(section),
            sanitizeValue(phone),
            sanitizeValue(leaderName),
            sanitizeValue(campaignName),
            sanitizeValue(createdAt ? formatDate(createdAt) : ""),
          ].join(";") + "\n";

          controller.enqueue(new TextEncoder().encode(csvLine));
        }

        controller.close();
      },
    });

    return { ok: true, stream, count: totalCount };
  } catch (error) {
    console.error("Export CSV error:", error);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao gerar exportação",
    };
  }
}
