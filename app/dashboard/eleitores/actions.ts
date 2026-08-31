"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  listVoters,
  getVoterStats,
  editVoter,
  deleteVoter,
} from "@/lib/services/voter";
import { generateVoterRegistrationLink } from "@/lib/services/registration";
import { ActionResult } from "@/lib/types";
import { logAuditEvent } from "@/lib/services/audit";

export async function listVotersAction(options?: {
  campaignId?: string;
  leaderId?: string;
  zone?: string;
  section?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<
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
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado",
    };
  }

  return listVoters(
    result.session.userId,
    result.user?.role || "leader",
    options || {}
  );
}

export async function getVoterStatsAction(): Promise<
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
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado",
    };
  }

  return getVoterStats(result.session.userId, result.user?.role || "leader");
}

export async function editVoterAction(
  voterId: string,
  data: {
    name?: string;
    zone?: string;
    section?: string;
    phone?: string;
  }
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado",
    };
  }

  const editResult = await editVoter(
    voterId,
    data,
    result.session.userId,
    result.user?.role || "leader"
  );

  if (editResult.ok) {
    await logAuditEvent({
      action: "update",
      entity: "voter",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: editResult.data.id,
    });
  }

  return editResult;
}

export async function deleteVoterAction(
  voterId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado",
    };
  }

  const deleteResult = await deleteVoter(
    voterId,
    result.session.userId,
    result.user?.role || "leader"
  );

  if (deleteResult.ok) {
    await logAuditEvent({
      action: "delete",
      entity: "voter",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: deleteResult.data.id,
    });
  }

  return deleteResult;
}

export async function generateVoterLinkAction(): Promise<
  ActionResult<{ token: string; url: string }>
> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para gerar links",
    };
  }

  if (
    result.user?.role !== "admin" &&
    result.user?.role !== "coordinator" &&
    result.user?.role !== "leader"
  ) {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores, coordenadores ou líderes podem gerar links de eleitor",
    };
  }

  return generateVoterRegistrationLink(result.session.userId);
}
