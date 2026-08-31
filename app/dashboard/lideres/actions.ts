"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  inviteLeader,
  acceptInvite,
  completePasswordReset,
  deactivateLeader,
} from "@/lib/services/invitation";
import {
  generateRegistrationToken,
  deactivateRegistrationToken,
  listRegistrationTokens,
} from "@/lib/services/registration";
import { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/services/audit";

export async function inviteLeaderAction(data: {
  firstName: string;
  lastName: string;
  voterTitle?: string;
  zone?: string;
  section?: string;
  address?: string;
  cep?: string;
  localAtuacao?: string;
}): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para convidar líderes",
    };
  }

  if (result.user?.role !== "admin" && result.user?.role !== "coordinator") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores ou coordenadores podem convidar líderes",
    };
  }

  const invitationResult = await inviteLeader({
    firstName: data.firstName,
    lastName: data.lastName,
    adminId: result.session.userId,
    coordinatorId: result.user?.role === "coordinator" ? result.session.userId : undefined,
    voterTitle: data.voterTitle,
    zone: data.zone,
    section: data.section,
    address: data.address,
    cep: data.cep,
    localAtuacao: data.localAtuacao,
  });

  if (!invitationResult.ok) {
    return invitationResult;
  }

  await logAuditEvent({
    action: "invite",
    entity: "invitation",
    actorId: result.session.userId,
    actorEmail: result.user?.email,
    entityId: invitationResult.data.id,
  });

  return {
    ok: true,
    data: { id: invitationResult.data.id },
  };
}

export async function acceptInviteAction(data: {
  token: string;
  password: string;
}): Promise<ActionResult<void>> {
  const result = await acceptInvite({
    token: data.token,
    password: data.password,
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: undefined };
}

export async function completePasswordResetAction(data: {
  token: string;
  newPassword: string;
}): Promise<ActionResult<void>> {
  const result = await completePasswordReset({
    token: data.token,
    newPassword: data.newPassword,
  });

  if (!result.ok) {
    return result;
  }

  return { ok: true, data: undefined };
}

export async function deactivateLeaderAction(
  leaderId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para desativar líderes",
    };
  }

  if (result.user?.role !== "admin" && result.user?.role !== "coordinator") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores ou coordenadores podem desativar líderes",
    };
  }

  const deactivationResult = await deactivateLeader(leaderId, result.session.userId);
  if (deactivationResult.ok) {
    revalidatePath("/dashboard/lideres");
    revalidatePath("/dashboard/campanhas", "page");
    await logAuditEvent({
      action: "update",
      entity: "user",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: deactivationResult.data.id,
      metadata: { operation: "deactivate_leader" },
    });
  }

  return deactivationResult;
}

export async function generateLeaderLinkAction(): Promise<
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

  if (result.user?.role !== "admin" && result.user?.role !== "coordinator") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores ou coordenadores podem gerar links de líder",
    };
  }

  const tokenResult = await generateRegistrationToken({
    role: "leader",
    invitedBy: result.session.userId,
    coordinatorId: result.user?.role === "coordinator" ? result.session.userId : undefined,
  });

  if (tokenResult.ok) {
    await logAuditEvent({
      action: "create",
      entity: "registration_token",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: tokenResult.data.token,
      metadata: { role: "leader" },
    });
  }

  return tokenResult;
}

export async function deactivateLeaderLinkAction(
  tokenId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para desativar links",
    };
  }

  const deactivationResult = await deactivateRegistrationToken(
    tokenId,
    result.session.userId
  );

  if (deactivationResult.ok) {
    revalidatePath("/dashboard/lideres");
    await logAuditEvent({
      action: "update",
      entity: "registration_token",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: deactivationResult.data.id,
      metadata: { operation: "deactivate_registration_token" },
    });
  }

  return deactivationResult;
}

export async function listLeaderLinksAction(): Promise<
  ActionResult<{
    tokens: Array<{
      id: string;
      token: string;
      role: string;
      coordinatorId: string | null;
      active: boolean;
      createdAt: Date;
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
      message: "Você precisa estar logado para listar links",
    };
  }

  if (result.user?.role !== "admin" && result.user?.role !== "coordinator") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores ou coordenadores podem listar links de líder",
    };
  }

  return listRegistrationTokens(result.session.userId, result.user?.role || "admin");
}
