import { db } from "@/db/drizzle";
import { campaign, campaign_leader } from "@/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { ActionResult } from "@/lib/types";

export enum CampaignStatus {
  DRAFT = "draft",
  OPEN = "open",
  CLOSED = "closed",
}

export interface Campaign {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: CampaignStatus;
  createdBy: string;
  openedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignWithLeaders extends Campaign {
  leaders: Array<{
    id: string;
    leaderId: string;
    publicCode: string;
    active: boolean;
  }>;
}

export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  const transitions: Record<CampaignStatus, CampaignStatus[]> = {
    [CampaignStatus.DRAFT]: [CampaignStatus.OPEN],
    [CampaignStatus.OPEN]: [CampaignStatus.CLOSED],
    [CampaignStatus.CLOSED]: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function validateTransition(
  from: CampaignStatus,
  to: CampaignStatus
): ActionResult<void> {
  if (!canTransition(from, to)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Não é possível transicionar de ${from} para ${to}`,
    };
  }
  return { ok: true, data: undefined };
}

export async function createCampaign(
  data: {
    name: string;
    slug: string;
    description?: string;
  },
  userId: string
): Promise<ActionResult<Campaign>> {
  try {
    const [newCampaign] = await db
      .insert(campaign)
      .values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        status: CampaignStatus.DRAFT,
        createdBy: userId,
      })
      .returning();

    return {
      ok: true,
      data: {
        ...newCampaign,
        status: newCampaign.status as CampaignStatus,
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao criar campanha",
    };
  }
}

export async function updateCampaign(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
  },
  userId: string
): Promise<ActionResult<Campaign>> {
  try {
    const [existing] = await db
      .select()
      .from(campaign)
      .where(eq(campaign.id, id))
      .limit(1);

    if (!existing) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Campanha não encontrada",
      };
    }

    if (existing.status !== CampaignStatus.DRAFT) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Só é possível editar campanhas em rascunho",
      };
    }

    const [updated] = await db
      .update(campaign)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(campaign.id, id))
      .returning();

    return {
      ok: true,
      data: {
        ...updated,
        status: updated.status as CampaignStatus,
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao atualizar campanha",
    };
  }
}

export async function transitionCampaign(
  id: string,
  toStatus: CampaignStatus,
  userId: string
): Promise<ActionResult<Campaign>> {
  try {
    const [existing] = await db
      .select()
      .from(campaign)
      .where(eq(campaign.id, id))
      .limit(1);

    if (!existing) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Campanha não encontrada",
      };
    }

    const currentStatus = existing.status as CampaignStatus;
    const validation = validateTransition(currentStatus, toStatus);
    if (!validation.ok) {
      return validation as ActionResult<Campaign>;
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status: toStatus,
      updatedAt: now,
    };

    if (toStatus === CampaignStatus.OPEN && !existing.openedAt) {
      updateData.openedAt = now;
    }

    if (toStatus === CampaignStatus.CLOSED && !existing.closedAt) {
      updateData.closedAt = now;
    }

    const [updated] = await db
      .update(campaign)
      .set(updateData)
      .where(eq(campaign.id, id))
      .returning();

    return {
      ok: true,
      data: {
        ...updated,
        status: updated.status as CampaignStatus,
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao transicionar campanha",
    };
  }
}

export async function listCampaigns(
  userId: string,
  role: string,
  options?: {
    page?: number;
    limit?: number;
    status?: CampaignStatus;
  }
): Promise<
  ActionResult<{
    campaigns: Campaign[];
    total: number;
    page: number;
    limit: number;
  }>
> {
  try {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 25, 100);
    const offset = (page - 1) * limit;

    const whereConditions = [];
    
    if (options?.status) {
      whereConditions.push(eq(campaign.status, options.status));
    }

    if (role === "leader") {
      const leaderCampaignIds = db
        .select({ campaignId: campaign_leader.campaignId })
        .from(campaign_leader)
        .where(
          and(
            eq(campaign_leader.leaderId, userId),
            eq(campaign_leader.active, true)
          )
        );

      whereConditions.push(sql`${campaign.id} IN ${leaderCampaignIds}`);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaign)
      .where(whereClause);

    const campaigns = await db
      .select()
      .from(campaign)
      .where(whereClause)
      .orderBy(desc(campaign.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      ok: true,
      data: {
        campaigns: campaigns.map((c) => ({
          ...c,
          status: c.status as CampaignStatus,
        })),
        total: countResult?.count || 0,
        page,
        limit,
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao listar campanhas",
    };
  }
}

export async function getCampaign(
  id: string,
  userId: string,
  role: string
): Promise<ActionResult<CampaignWithLeaders>> {
  try {
    const [campaignData] = await db
      .select()
      .from(campaign)
      .where(eq(campaign.id, id))
      .limit(1);

    if (!campaignData) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Campanha não encontrada",
      };
    }

    if (role === "leader") {
      const [leaderLink] = await db
        .select()
        .from(campaign_leader)
        .where(
          and(
            eq(campaign_leader.campaignId, id),
            eq(campaign_leader.leaderId, userId),
            eq(campaign_leader.active, true)
          )
        )
        .limit(1);

      if (!leaderLink) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Você não tem acesso a esta campanha",
        };
      }
    }

    const leaders = await db
      .select()
      .from(campaign_leader)
      .where(eq(campaign_leader.campaignId, id));

    return {
      ok: true,
      data: {
        ...campaignData,
        status: campaignData.status as CampaignStatus,
        leaders: leaders.map((l) => ({
          id: l.id,
          leaderId: l.leaderId,
          publicCode: l.publicCode,
          active: l.active,
        })),
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao buscar campanha",
    };
  }
}