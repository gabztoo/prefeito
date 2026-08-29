import { db } from "@/db/drizzle";
import { voter, campaign_leader, campaign, user } from "@/db/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { validateVoterData } from "@/lib/validation";
import { isHoneypotFilled, getIpFromHeaders, normalizeIp, getCurrentWindow, incrementRateLimit } from "@/lib/rate-limit";

type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code:
        | "VALIDATION_ERROR"
        | "UNAUTHENTICATED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "CAMPAIGN_CLOSED"
        | "LINK_INACTIVE"
        | "DUPLICATE_PHONE"
        | "RATE_LIMITED"
        | "EMAIL_DELIVERY_FAILED"
        | "INTERNAL_ERROR";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

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

  return db.transaction(async (tx) => {
    const campaignLeader = await tx
      .execute(
        sql`
          SELECT c.id as campaign_id, c.slug as campaign_slug, c.status as campaign_status,
                 cl.id as leader_id, cl.active as leader_active
          FROM campaign c
          INNER JOIN campaign_leader cl ON c.id = cl.campaign_id
          WHERE c.slug = ${campaignSlug}
            AND cl.public_code = ${publicCode}
            AND cl.active = true
            AND c.status = 'open'
          FOR UPDATE OF c, cl
          LIMIT 1
        `
      )
      .then((result) => (result.rows as Array<{
        campaign_id: string;
        campaign_slug: string;
        campaign_status: string;
        leader_id: string;
        leader_active: boolean;
      }>));

    if (campaignLeader.length === 0) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Campanha não encontrada ou link inativo",
      } as ActionResult<{ id: string }>;
    }

    const { campaign_id: campaignId, leader_id: leaderId } = campaignLeader[0];

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
      })
      .returning({ id: voter.id });

    return {
      ok: true,
      data: { id: newVoter.id },
    };
  });
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
      campaignId: string;
      campaignLeaderId: string;
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
    const leaderRecord = await db
      .select()
      .from(campaign_leader)
      .where(eq(campaign_leader.leaderId, userId))
      .limit(1);

    if (leaderRecord.length === 0) {
      return {
        ok: true,
        data: {
          voters: [],
          totalFiltered: 0,
          page,
          limit,
        },
      };
    }

    const conditions = [eq(voter.campaignLeaderId, leaderRecord[0].id)];

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
      conditions.push(
        sql`${voter.name} ILIKE ${"%" + filters.search + "%"}`
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
      .orderBy(voter.createdAt);

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
    conditions.push(
      sql`${voter.name} ILIKE ${"%" + filters.search + "%"}`
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
    .orderBy(voter.createdAt);

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
    const leaderRecord = await db
      .select()
      .from(campaign_leader)
      .where(eq(campaign_leader.leaderId, userId))
      .limit(1);

    if (leaderRecord.length === 0) {
      return {
        ok: true,
        data: {
          byCampaign: [],
          byLeader: [],
          grandTotal: 0,
        },
      };
    }

    const leaderId = leaderRecord[0].id;

    const [totalResult] = await db
      .select({ total: count() })
      .from(voter)
      .where(eq(voter.campaignLeaderId, leaderId));

    const campaignInfo = await db
      .select({
        campaignId: campaign.id,
        campaignName: campaign.name,
      })
      .from(campaign)
      .innerJoin(
        campaign_leader,
        eq(campaign.id, campaign_leader.campaignId)
      )
      .where(eq(campaign_leader.id, leaderId))
      .limit(1);

    const [stats] = await db
      .select({ total: count() })
      .from(voter)
      .where(eq(voter.campaignLeaderId, leaderId));

    return {
      ok: true,
      data: {
        byCampaign: campaignInfo.length > 0
          ? [{ campaignId: campaignInfo[0].campaignId, campaignName: campaignInfo[0].campaignName, total: Number(stats.total) }]
          : [],
        byLeader: [],
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

  const updateData: Partial<{
    name: string;
    zone: string;
    section: string;
    phone: string;
  }> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.zone !== undefined) updateData.zone = data.zone;
  if (data.section !== undefined) updateData.section = data.section;
  if (data.phone !== undefined) {
    if (data.phone !== existing[0].phone) {
      const duplicate = await db
        .select()
        .from(voter)
        .where(
          and(
            eq(voter.campaignId, existing[0].campaignId),
            eq(voter.phone, data.phone),
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
    updateData.phone = data.phone;
  }

  const [updated] = await db
    .update(voter)
    .set(updateData)
    .where(eq(voter.id, voterId))
    .returning({ id: voter.id });

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