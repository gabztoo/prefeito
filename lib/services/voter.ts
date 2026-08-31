import { db } from "@/db/drizzle";
import { voter, campaign_leader, campaign, user } from "@/db/schema";
import { eq, and, asc, desc, inArray, or, sql, count } from "drizzle-orm";
import { validateVoterData } from "@/lib/validation";
import { normalizePhone } from "@/lib/normalization";
import { isHoneypotFilled, getIpFromHeaders, normalizeIp, getCurrentWindow, incrementRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/types";

export function getVoterSearchTerms(search: string): {
  name: string;
  phone: string | null;
} {
  const name = search.trim();
  const phone = normalizePhone(search) || null;

  return { name, phone: phone || null };
}

/**
 * Register a voter
 */
export async function registerVoter(
  campaignSlug: string,
  publicCode: string,
  data: {
    name: string;
    zone: string;
    section: string;
    phone: string;
    voterTitle?: string;
    honeypot?: string;
  },
  headers: Headers
): Promise<ActionResult<{ id: string }>> {
  // Check honeypot
  if (isHoneypotFilled(data.honeypot)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Dados inválidos",
    };
  }

  // Validate data
  const validation = validateVoterData(data);
  if (!validation.ok) {
    return validation;
  }

  const { name, zone, section, phone } = validation.data;

  const voterTitle = data.voterTitle || null;

  // Get IP for rate limiting
  const ip = getIpFromHeaders(headers);
  if (!ip) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro interno",
    };
  }

  const normalizedIp = normalizeIp(ip);
  const window = getCurrentWindow();

  const rateLimitResult = await incrementRateLimit(normalizedIp, publicCode, window);
  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: "Tente novamente após 10 minutos",
    };
  }

  try {
    return await db.transaction(async (tx) => {
      const campaignLeader = await tx
        .execute(
          sql`
             SELECT c."id" as campaign_id, c."slug" as campaign_slug, c."status" as campaign_status,
                    cl."id" as leader_id, cl."active" as leader_active,
                    u."banned" as leader_banned
             FROM "campaign" c
             INNER JOIN "campaign_leader" cl ON c."id" = cl."campaignId"
             INNER JOIN "user" u ON u."id" = cl."leaderId"
             WHERE c."slug" = ${campaignSlug}
               AND cl."publicCode" = ${publicCode}
             LIMIT 1
             FOR SHARE OF c, cl, u
           `
        )
        .then((result) => (result.rows as Array<{
          campaign_id: string;
          campaign_slug: string;
          campaign_status: string;
          leader_id: string;
          leader_active: boolean;
          leader_banned: boolean;
        }>));

      if (campaignLeader.length === 0) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Campanha não encontrada ou link inativo",
        } as ActionResult<{ id: string }>;
      }

      const {
        campaign_id: campaignId,
        campaign_status: campaignStatus,
        leader_id: leaderId,
        leader_active: leaderActive,
        leader_banned: leaderBanned,
      } = campaignLeader[0];

      if (campaignStatus !== "open") {
        return {
          ok: false,
          code: "CAMPAIGN_CLOSED",
          message: "Esta campanha não está aceitando novos cadastros",
        } as ActionResult<{ id: string }>;
      }

      if (!leaderActive || leaderBanned) {
        return {
          ok: false,
          code: "LINK_INACTIVE",
          message: "Este link de cadastro não está ativo",
        } as ActionResult<{ id: string }>;
      }

    const existingVoter = await tx
      .select()
      .from(voter)
      .where(
        and(
          eq(voter.campaignId, campaignId),
          eq(voter.phone, phone)
        )
      )
      .limit(1);

      if (existingVoter.length > 0) {
        return {
          ok: false,
          code: "DUPLICATE_PHONE",
          message: "Telefone já cadastrado nesta campanha",
        } as ActionResult<{ id: string }>;
      }

    const [newVoter] = await tx
      .insert(voter)
      .values({
        campaignId,
        campaignLeaderId: leaderId,
        name,
        zone,
        section,
        phone,
        voterTitle,
      })
      .returning({ id: voter.id });

      return {
        ok: true,
        data: { id: newVoter.id },
      };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return {
        ok: false,
        code: "DUPLICATE_PHONE",
        message: "Telefone já cadastrado nesta campanha",
      };
    }

    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao cadastrar eleitor",
    };
  }
}

/**
 * List voters with pagination and filters
 */
export async function listVoters(
  userId: string,
  role: string,
  filters: {
    campaignId?: string;
    leaderId?: string;
    zone?: string;
    section?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
): Promise<
  ActionResult<{
    voters: Array<{
      id: string;
      name: string;
      zone: string;
      section: string;
      phone: string;
      voterTitle: string | null;
      campaignId: string | null;
      campaignLeaderId: string | null;
      createdAt: Date;
    }>;
    totalFiltered: number;
    page: number;
    limit: number;
  }>
> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 25, 100);
  const offset = (page - 1) * limit;

  if (role === "leader") {
    const leaderLinkIds = db
      .select({ id: campaign_leader.id })
      .from(campaign_leader)
      .where(
        and(
          eq(campaign_leader.leaderId, userId),
          eq(campaign_leader.active, true)
        )
      );

    const conditions = [inArray(voter.campaignLeaderId, leaderLinkIds)];

    if (filters.campaignId) {
      conditions.push(eq(voter.campaignId, filters.campaignId));
    }
    if (filters.zone) {
      conditions.push(eq(voter.zone, filters.zone));
    }
    if (filters.section) {
      conditions.push(eq(voter.section, filters.section));
    }
    if (filters.search) {
      const searchTerms = getVoterSearchTerms(filters.search);
      const nameCondition = sql`${voter.name} ILIKE ${"%" + searchTerms.name + "%"}`;
      conditions.push(
        searchTerms.phone
          ? (or(nameCondition, eq(voter.phone, searchTerms.phone)) ?? nameCondition)
          : nameCondition
      );
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(voter)
      .where(and(...conditions));

    const voters = await db
      .select()
      .from(voter)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(voter.createdAt), asc(voter.id));

    return {
      ok: true,
      data: {
        voters,
        totalFiltered: Number(total),
        page,
        limit,
      },
    };
  }

  if (role === "coordinator") {
    const coordinatorLeaderIds = db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.role, "leader"),
          eq(user.coordinatorId, userId)
        )
      );

    const leaderLinkIds = db
      .select({ id: campaign_leader.id })
      .from(campaign_leader)
      .where(
        and(
          inArray(campaign_leader.leaderId, coordinatorLeaderIds),
          eq(campaign_leader.active, true)
        )
      );

    const conditions = [inArray(voter.campaignLeaderId, leaderLinkIds)];

    if (filters.campaignId) {
      conditions.push(eq(voter.campaignId, filters.campaignId));
    }
    if (filters.zone) {
      conditions.push(eq(voter.zone, filters.zone));
    }
    if (filters.section) {
      conditions.push(eq(voter.section, filters.section));
    }
    if (filters.search) {
      const searchTerms = getVoterSearchTerms(filters.search);
      const nameCondition = sql`${voter.name} ILIKE ${"%" + searchTerms.name + "%"}`;
      conditions.push(
        searchTerms.phone
          ? (or(nameCondition, eq(voter.phone, searchTerms.phone)) ?? nameCondition)
          : nameCondition
      );
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(voter)
      .where(and(...conditions));

    const voters = await db
      .select()
      .from(voter)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(voter.createdAt), asc(voter.id));

    return {
      ok: true,
      data: {
        voters,
        totalFiltered: Number(total),
        page,
        limit,
      },
    };
  }

  const conditions = [];

  if (filters.campaignId) {
    conditions.push(eq(voter.campaignId, filters.campaignId));
  }
  if (filters.leaderId) {
    conditions.push(eq(voter.campaignLeaderId, filters.leaderId));
  }
  if (filters.zone) {
    conditions.push(eq(voter.zone, filters.zone));
  }
  if (filters.section) {
    conditions.push(eq(voter.section, filters.section));
  }
  if (filters.search) {
    const searchTerms = getVoterSearchTerms(filters.search);
    const nameCondition = sql`${voter.name} ILIKE ${"%" + searchTerms.name + "%"}`;
    conditions.push(
      searchTerms.phone
        ? (or(nameCondition, eq(voter.phone, searchTerms.phone)) ?? nameCondition)
        : nameCondition
    );
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(voter)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const voters = await db
    .select()
    .from(voter)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(voter.createdAt), asc(voter.id));

  return {
    ok: true,
    data: {
      voters,
      totalFiltered: Number(total),
      page,
      limit,
    },
  };
}

/**
 * Get voter statistics by campaign and leader
 */
export async function getVoterStats(
  userId: string,
  role: string
): Promise<
  ActionResult<{
    byCampaign: Array<{
      campaignId: string;
      campaignName: string;
      total: number;
    }>;
    byLeader: Array<{
      leaderId: string;
      leaderName: string;
      total: number;
    }>;
    grandTotal: number;
  }>
> {
  if (role === "leader") {
    const leaderLinkIds = db
      .select({ id: campaign_leader.id })
      .from(campaign_leader)
      .where(
        and(
          eq(campaign_leader.leaderId, userId),
          eq(campaign_leader.active, true)
        )
      );

    const [totalResult] = await db
      .select({ total: count() })
      .from(voter)
      .where(inArray(voter.campaignLeaderId, leaderLinkIds));

    const byCampaignRaw = await db
      .select({
        campaignId: campaign.id,
        campaignName: campaign.name,
        total: count(voter.id),
      })
      .from(campaign_leader)
      .innerJoin(campaign, eq(campaign.id, campaign_leader.campaignId))
      .leftJoin(
        voter,
        and(
          eq(voter.campaignLeaderId, campaign_leader.id),
          eq(voter.campaignId, campaign_leader.campaignId)
        )
      )
      .where(
        and(
          eq(campaign_leader.leaderId, userId),
          eq(campaign_leader.active, true)
        )
      )
      .groupBy(campaign.id, campaign.name);

    return {
      ok: true,
      data: {
        byCampaign: byCampaignRaw.map((row) => ({
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          total: Number(row.total),
        })),
        byLeader: [],
        grandTotal: Number(totalResult.total),
      },
    };
  }

  if (role === "coordinator") {
    const coordinatorLeaderIds = db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          eq(user.role, "leader"),
          eq(user.coordinatorId, userId)
        )
      );

    const leaderLinkIds = db
      .select({ id: campaign_leader.id })
      .from(campaign_leader)
      .where(
        and(
          inArray(campaign_leader.leaderId, coordinatorLeaderIds),
          eq(campaign_leader.active, true)
        )
      );

    const [totalResult] = await db
      .select({ total: count() })
      .from(voter)
      .where(inArray(voter.campaignLeaderId, leaderLinkIds));

    const byCampaignRaw = await db
      .select({
        campaignId: campaign.id,
        campaignName: campaign.name,
        total: count(voter.id),
      })
      .from(campaign_leader)
      .innerJoin(campaign, eq(campaign.id, campaign_leader.campaignId))
      .leftJoin(
        voter,
        and(
          eq(voter.campaignLeaderId, campaign_leader.id),
          eq(voter.campaignId, campaign_leader.campaignId)
        )
      )
      .where(
        and(
          inArray(campaign_leader.leaderId, coordinatorLeaderIds),
          eq(campaign_leader.active, true)
        )
      )
      .groupBy(campaign.id, campaign.name);

    const byLeaderRaw = await db
      .select({
        leaderId: campaign_leader.leaderId,
        leaderName: user.name,
        total: count(voter.id),
      })
      .from(campaign_leader)
      .leftJoin(voter, eq(campaign_leader.id, voter.campaignLeaderId))
      .innerJoin(user, eq(campaign_leader.leaderId, user.id))
      .where(
        and(
          inArray(campaign_leader.leaderId, coordinatorLeaderIds),
          eq(campaign_leader.active, true)
        )
      )
      .groupBy(campaign_leader.leaderId, user.name);

    return {
      ok: true,
      data: {
        byCampaign: byCampaignRaw.map((row) => ({
          campaignId: row.campaignId,
          campaignName: row.campaignName,
          total: Number(row.total),
        })),
        byLeader: byLeaderRaw.map((r) => ({
          leaderId: r.leaderId,
          leaderName: r.leaderName || "Desconhecido",
          total: Number(r.total),
        })),
        grandTotal: Number(totalResult.total),
      },
    };
  }

  const byCampaignRaw = await db
    .select({
      campaignId: campaign.id,
      campaignName: campaign.name,
      total: count(),
    })
    .from(campaign)
    .leftJoin(voter, eq(campaign.id, voter.campaignId))
    .groupBy(campaign.id, campaign.name);

  const byLeaderRaw = await db
    .select({
      leaderId: campaign_leader.leaderId,
      leaderName: user.name,
      total: count(voter.id),
    })
    .from(campaign_leader)
    .leftJoin(voter, eq(campaign_leader.id, voter.campaignLeaderId))
    .leftJoin(user, eq(campaign_leader.leaderId, user.id))
    .groupBy(campaign_leader.leaderId, user.name);

  const [grandTotalResult] = await db
    .select({ total: count() })
    .from(voter);

  return {
    ok: true,
    data: {
      byCampaign: byCampaignRaw.map((r) => ({
        campaignId: r.campaignId,
        campaignName: r.campaignName,
        total: Number(r.total),
      })),
      byLeader: byLeaderRaw.map((r) => ({
        leaderId: r.leaderId,
        leaderName: r.leaderName || "Desconhecido",
        total: Number(r.total),
      })),
      grandTotal: Number(grandTotalResult.total),
    },
  };
}

/**
 * Edit a voter (admin only)
 */
export async function editVoter(
  voterId: string,
  data: {
    name?: string;
    zone?: string;
    section?: string;
    phone?: string;
  },
  userId: string,
  role: string
): Promise<ActionResult<{ id: string }>> {
  if (role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem editar eleitores",
    };
  }

  const existing = await db
    .select()
    .from(voter)
    .where(eq(voter.id, voterId))
    .limit(1);

  if (existing.length === 0) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Eleitor não encontrado",
    };
  }

  const validation = validateVoterData({
    name: data.name ?? existing[0].name,
    zone: data.zone ?? existing[0].zone,
    section: data.section ?? existing[0].section,
    phone: data.phone ?? existing[0].phone,
  });

  if (!validation.ok) {
    return validation;
  }

  const normalizedData = validation.data;

  const updateData: Partial<{
    name: string;
    zone: string;
    section: string;
    phone: string;
  }> = {};

  if (data.name !== undefined) updateData.name = normalizedData.name;
  if (data.zone !== undefined) updateData.zone = normalizedData.zone;
  if (data.section !== undefined) updateData.section = normalizedData.section;
  if (data.phone !== undefined) {
    if (normalizedData.phone !== existing[0].phone) {
      const duplicate = await db
        .select()
        .from(voter)
        .where(
          and(
            existing[0].campaignId ? eq(voter.campaignId, existing[0].campaignId) : undefined,
            eq(voter.phone, normalizedData.phone),
            sql`${voter.id} != ${voterId}`
          )
        )
        .limit(1);

      if (duplicate.length > 0) {
        return {
          ok: false,
          code: "DUPLICATE_PHONE",
          message: "Telefone já cadastrado nesta campanha",
        };
      }
    }
    updateData.phone = normalizedData.phone;
  }

  let updated: { id: string } | undefined;
  try {
    [updated] = await db
      .update(voter)
      .set(updateData)
      .where(eq(voter.id, voterId))
      .returning({ id: voter.id });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return {
        ok: false,
        code: "DUPLICATE_PHONE",
        message: "Telefone já cadastrado nesta campanha",
      };
    }

    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao editar eleitor",
    };
  }

  if (!updated) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Eleitor não encontrado",
    };
  }

  return {
    ok: true,
    data: { id: updated.id },
  };
}

/**
 * Delete a voter (admin only)
 */
export async function deleteVoter(
  voterId: string,
  userId: string,
  role: string
): Promise<ActionResult<{ id: string }>> {
  if (role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem excluir eleitores",
    };
  }

  const existing = await db
    .select()
    .from(voter)
    .where(eq(voter.id, voterId))
    .limit(1);

  if (existing.length === 0) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "Eleitor não encontrado",
    };
  }

  await db.delete(voter).where(eq(voter.id, voterId));

  return {
    ok: true,
    data: { id: voterId },
  };
}
