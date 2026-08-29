"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  createCampaign,
  updateCampaign,
  transitionCampaign,
  listCampaigns,
  getCampaign,
  assignLeaderToCampaign,
  listLeaderCampaignLinks,
  CampaignStatus,
} from "@/lib/services/campaign";
import { ActionResult } from "@/lib/types";

export async function createCampaignAction(data: {
  name: string;
  slug: string;
  description?: string;
}): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para criar uma campanha",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem criar campanhas",
    };
  }

  const campaignResult = await createCampaign(data, result.session.userId);

  if (!campaignResult.ok) {
    return campaignResult;
  }

  return {
    ok: true,
    data: { id: campaignResult.data.id },
  };
}

export async function updateCampaignAction(
  id: string,
  data: {
    name?: string;
    slug?: string;
    description?: string;
  }
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para atualizar uma campanha",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem atualizar campanhas",
    };
  }

  const campaignResult = await updateCampaign(id, data, result.session.userId);

  if (!campaignResult.ok) {
    return campaignResult;
  }

  return {
    ok: true,
    data: { id: campaignResult.data.id },
  };
}

export async function transitionCampaignAction(
  id: string,
  toStatus: CampaignStatus
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para transicionar uma campanha",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem transicionar campanhas",
    };
  }

  const campaignResult = await transitionCampaign(
    id,
    toStatus,
    result.session.userId
  );

  if (!campaignResult.ok) {
    return campaignResult;
  }

  return {
    ok: true,
    data: { id: campaignResult.data.id },
  };
}

export async function assignLeaderToCampaignAction(
  campaignId: string,
  leaderId: string
): Promise<ActionResult<{ id: string; publicCode: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para vincular um líder",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem vincular líderes",
    };
  }

  const linkResult = await assignLeaderToCampaign(campaignId, leaderId);
  if (linkResult.ok) {
    revalidatePath(`/dashboard/campanhas/${campaignId}`);
  }

  return linkResult;
}

export async function listLeaderCampaignLinksAction(): Promise<
  ActionResult<
    Array<{
      campaignLeaderId: string;
      campaignId: string;
      campaignName: string;
      campaignSlug: string;
      campaignStatus: CampaignStatus;
      publicCode: string;
      active: boolean;
    }>
  >
> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para listar seus links",
    };
  }

  if (result.user?.role !== "leader") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas líderes possuem links de cadastro",
    };
  }

  return listLeaderCampaignLinks(result.session.userId);
}

export async function listCampaignsAction(options?: {
  page?: number;
  limit?: number;
  status?: CampaignStatus;
}): Promise<
  ActionResult<{
    campaigns: Array<{
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
    }>;
    total: number;
    page: number;
    limit: number;
  }>
> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para listar campanhas",
    };
  }

  return listCampaigns(
    result.session.userId,
    result.user?.role || "leader",
    options
  );
}

export async function getCampaignAction(
  id: string
): Promise<
  ActionResult<{
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
    leaders: Array<{
      id: string;
      leaderId: string;
      leaderName: string;
      leaderEmail: string;
      publicCode: string;
      active: boolean;
    }>;
  }>
> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para visualizar campanhas",
    };
  }

  return getCampaign(
    id,
    result.session.userId,
    result.user?.role || "leader"
  );
}
