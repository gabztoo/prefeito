import { listVoters, listVotersByLeader } from "@/lib/services/voter";
import { buildVoterWorkbook } from "@/lib/voter-export";

const MAX_EXPORT_RECORDS = 100_000;
const EXPORT_PAGE_SIZE = 100;

export type ExportFilters = {
  campaignId?: string;
  leaderId?: string;
  leaderUserId?: string;
  zone?: string;
  section?: string;
  search?: string;
};

export type ExportResult =
  | { ok: true; buffer: Buffer; count: number }
  | {
      ok: false;
      code: "TOO_MANY_RECORDS" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export async function exportVotersXlsx(
  userId: string,
  role: string,
  filters: ExportFilters
): Promise<ExportResult> {
  if (!["admin", "coordinator", "leader"].includes(role)) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Você não tem permissão para exportar eleitores",
    };
  }

  try {
    const { leaderUserId, ...voterFilters } = filters;
    const loadPage = (page: number) => leaderUserId
      ? listVotersByLeader(leaderUserId, userId, role, { page, limit: EXPORT_PAGE_SIZE })
      : listVoters(userId, role, { ...voterFilters, page, limit: EXPORT_PAGE_SIZE });

    const firstPage = await loadPage(1);

    if (!firstPage.ok) {
      return {
        ok: false,
        code: firstPage.code === "FORBIDDEN" ? "FORBIDDEN" : "INTERNAL_ERROR",
        message: firstPage.message,
      };
    }

    const count = "total" in firstPage.data
      ? firstPage.data.total
      : firstPage.data.totalFiltered;
    const selectedLeaderName = "leader" in firstPage.data
      ? firstPage.data.leader.name
      : null;
    if (count > MAX_EXPORT_RECORDS) {
      return {
        ok: false,
        code: "TOO_MANY_RECORDS",
        message: `Limite de ${MAX_EXPORT_RECORDS.toLocaleString("pt-BR")} registros excedido. Filtre os dados para reduzir o volume.`,
      };
    }

    const voters = firstPage.data.voters.map((voter) => ({
      ...voter,
      leaderName: leaderUserId ? selectedLeaderName : voter.leaderName,
    }));
    const pageCount = Math.ceil(count / EXPORT_PAGE_SIZE);

    for (let page = 2; page <= pageCount; page++) {
      const pageResult = await loadPage(page);

      if (!pageResult.ok) {
        return {
          ok: false,
          code: pageResult.code === "FORBIDDEN" ? "FORBIDDEN" : "INTERNAL_ERROR",
          message: pageResult.message,
        };
      }

      voters.push(...pageResult.data.voters.map((voter) => ({
        ...voter,
        leaderName: leaderUserId ? selectedLeaderName : voter.leaderName,
      })));
    }

    const buffer = await buildVoterWorkbook(voters);
    return { ok: true, buffer, count };
  } catch (error) {
    console.error("Export XLSX error:", error);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao gerar exportação",
    };
  }
}
