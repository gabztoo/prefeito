import { db } from "@/db/drizzle";
import { campaign, campaign_leader, user } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ActionResult } from "@/lib/types";
import crypto from "crypto";

export enum CampaignStatus {
  DRAFT = "draft",
  OPEN = "open",
  CLOSED = "closed",
}

export interface LeaderCampaignLink {
  campaignLeaderId: string;
  campaignId: string;
  campaignName: string;
  campaignSlug: string;
  campaignStatus: CampaignStatus;
  publicCode: string;
  active: boolean;
}

export interface PublicCampaignLink {
  campaignName: string;
  campaignSlug: string;
  campaignStatus: CampaignStatus;
  leaderName: string;
  publicCode: string;
  active: boolean;
}

export function generatePublicCode(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function buildPublicLinkPath(
  campaignSlug: string,
  publicCode: string
): string {
  return `/c/${campaignSlug}/${publicCode}`;
}

export function buildPublicLinkUrl(
  baseUrl: string,
  campaignSlug: string,
  publicCode: string
): string {
  return `${baseUrl.replace(/\/$/, "")}${buildPublicLinkPath(
    campaignSlug,
    publicCode
  )}`;
}

export function buildWhatsAppShareUrl(publicUrl: string, campaignName: string): string {
  const message = `Cadastre-se na campanha ${campaignName}: ${publicUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function normalizeCampaignSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
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
    leaderName: string;
    leaderEmail: string;
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
    const slug = normalizeCampaignSlug(data.slug);
    if (!slug) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Informe um slug válido para a campanha",
      };
    }

    const [newCampaign] = await db
      .insert(campaign)
      .values({
        name: data.name,
         slug,
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

export async function assignLeaderToCampaign(
  campaignId: string,
  leaderId: string
): Promise<ActionResult<{ id: string; publicCode: string }>> {
  try {
    return await db.transaction(async (tx) => {
      const [campaignRecord] = await tx
        .select({ id: campaign.id, status: campaign.status })
        .from(campaign)
        .where(eq(campaign.id, campaignId))
        .limit(1);

      if (!campaignRecord) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Campanha não encontrada",
        };
      }

      if (campaignRecord.status === CampaignStatus.CLOSED) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Não é possível vincular líderes a uma campanha encerrada",
        };
      }

      const [leader] = await tx
        .select({ id: user.id, role: user.role, banned: user.banned })
        .from(user)
        .where(eq(user.id, leaderId))
        .limit(1);

      if (!leader || leader.role !== "leader") {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Líder não encontrado",
        };
      }

      if (leader.banned) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Líder desativado não pode ser vinculado",
        };
      }

      const [existingLink] = await tx
        .select({ id: campaign_leader.id, publicCode: campaign_leader.publicCode })
        .from(campaign_leader)
        .where(
          and(
            eq(campaign_leader.campaignId, campaignId),
            eq(campaign_leader.leaderId, leaderId)
          )
        )
        .limit(1);

      if (existingLink) {
        return { ok: true, data: existingLink };
      }

      const [createdLink] = await tx
        .insert(campaign_leader)
        .values({
          campaignId,
          leaderId,
          publicCode: generatePublicCode(),
          active: true,
        })
        .returning({ id: campaign_leader.id, publicCode: campaign_leader.publicCode });

      return {
        ok: true,
        data: createdLink,
      };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao vincular líder à campanha",
    };
  }
}

export async function revokeCampaignLeaderLink(
  campaignLeaderId: string,
  adminId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const [admin] = await db
      .select({ role: user.role })
      .from(user)
      .where(eq(user.id, adminId))
      .limit(1);

    if (admin?.role !== "admin") {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Apenas administradores podem revogar links",
      };
    }

    const [link] = await db
      .update(campaign_leader)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(campaign_leader.id, campaignLeaderId))
      .returning({ id: campaign_leader.id });

    if (!link) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Vínculo não encontrado",
      };
    }

    return { ok: true, data: link };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao revogar link",
    };
  }
}

export async function regenerateCampaignLeaderLink(
  campaignLeaderId: string,
  adminId: string
): Promise<ActionResult<{ id: string; publicCode: string }>> {
  try {
    return await db.transaction(async (tx) => {
      const [admin] = await tx
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, adminId))
        .limit(1);

      if (admin?.role !== "admin") {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Apenas administradores podem regenerar links",
        };
      }

      await tx.execute(sql`
        SELECT c."id"
        FROM "campaign" c
        INNER JOIN "campaign_leader" cl ON cl."campaignId" = c."id"
        WHERE cl."id" = ${campaignLeaderId}
        FOR UPDATE OF c
      `);

      await tx.execute(sql`
        SELECT cl."id"
        FROM "campaign_leader" cl
        WHERE cl."id" = ${campaignLeaderId}
        FOR UPDATE OF cl
      `);

      await tx.execute(sql`
        SELECT u."id"
        FROM "user" u
        INNER JOIN "campaign_leader" cl ON cl."leaderId" = u."id"
        WHERE cl."id" = ${campaignLeaderId}
        FOR UPDATE OF u
      `);

      const [existingLink] = await tx
        .select({
          id: campaign_leader.id,
          campaignStatus: campaign.status,
          leaderBanned: user.banned,
        })
        .from(campaign_leader)
        .innerJoin(campaign, eq(campaign.id, campaign_leader.campaignId))
        .innerJoin(user, eq(user.id, campaign_leader.leaderId))
        .where(eq(campaign_leader.id, campaignLeaderId))
        .limit(1);

      if (!existingLink) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Vínculo não encontrado",
        };
      }

      const [link] = await tx
        .update(campaign_leader)
        .set({
          publicCode: generatePublicCode(),
          active: existingLink.campaignStatus !== CampaignStatus.CLOSED && !existingLink.leaderBanned,
          updatedAt: new Date(),
        })
        .where(eq(campaign_leader.id, campaignLeaderId))
        .returning({ id: campaign_leader.id, publicCode: campaign_leader.publicCode });

      if (!link) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Vínculo não encontrado",
        };
      }

      return { ok: true, data: link };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao regenerar link",
    };
  }
}

export async function listLeaderCampaignLinks(
  leaderId: string
): Promise<ActionResult<LeaderCampaignLink[]>> {
  try {
    const links = await db
      .select({
        campaignLeaderId: campaign_leader.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignSlug: campaign.slug,
        campaignStatus: campaign.status,
        publicCode: campaign_leader.publicCode,
        active: campaign_leader.active,
      })
      .from(campaign_leader)
      .innerJoin(campaign, eq(campaign.id, campaign_leader.campaignId))
      .where(
        and(
          eq(campaign_leader.leaderId, leaderId),
          eq(campaign_leader.active, true)
        )
      )
      .orderBy(desc(campaign.createdAt));

    return {
      ok: true,
      data: links.map((link) => ({
        ...link,
        campaignStatus: link.campaignStatus as CampaignStatus,
      })),
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao carregar os links das campanhas",
    };
  }
}

export async function resolvePublicLink(
  campaignSlug: string,
  publicCode: string
): Promise<ActionResult<PublicCampaignLink>> {
  try {
    const [link] = await db
      .select({
        campaignName: campaign.name,
        campaignSlug: campaign.slug,
        campaignStatus: campaign.status,
        leaderName: user.name,
        publicCode: campaign_leader.publicCode,
        active: campaign_leader.active,
      })
      .from(campaign_leader)
      .innerJoin(campaign, eq(campaign.id, campaign_leader.campaignId))
      .innerJoin(user, eq(user.id, campaign_leader.leaderId))
      .where(
        and(
          eq(campaign.slug, campaignSlug),
          eq(campaign_leader.publicCode, publicCode)
        )
      )
      .limit(1);

    if (!link) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Link de cadastro não encontrado",
      };
    }

    return {
      ok: true,
      data: {
        ...link,
        campaignStatus: link.campaignStatus as CampaignStatus,
      },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao carregar o link de cadastro",
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

    const updateData = {
      ...data,
      ...(data.slug !== undefined
        ? { slug: normalizeCampaignSlug(data.slug) }
        : {}),
      updatedAt: new Date(),
    };

    if (data.slug !== undefined && !updateData.slug) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Informe um slug válido para a campanha",
      };
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
      .select({
        id: campaign_leader.id,
        leaderId: campaign_leader.leaderId,
        leaderName: user.name,
        leaderEmail: user.email,
        publicCode: campaign_leader.publicCode,
        active: campaign_leader.active,
      })
      .from(campaign_leader)
      .innerJoin(user, eq(user.id, campaign_leader.leaderId))
      .where(
        role === "leader"
          ? and(
              eq(campaign_leader.campaignId, id),
              eq(campaign_leader.leaderId, userId)
            )
          : eq(campaign_leader.campaignId, id)
      );

    return {
      ok: true,
      data: {
        ...campaignData,
        status: campaignData.status as CampaignStatus,
        leaders: leaders.map((l) => ({
          id: l.id,
          leaderId: l.leaderId,
          leaderName: l.leaderName,
          leaderEmail: l.leaderEmail,
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
