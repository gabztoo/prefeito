"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  inviteCoordinator,
  deactivateCoordinator,
  deleteCoordinator,
  resetUserPassword,
} from "@/lib/services/invitation";
import {
  generateRegistrationToken,
  generateVoterRegistrationLink,
  deactivateRegistrationToken,
  listRegistrationTokens,
} from "@/lib/services/registration";
import { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/services/audit";

export async function inviteCoordinatorAction(data: {
  firstName: string;
  lastName: string;
  rg?: string;
  cpf?: string;
  address?: string;
  cep?: string;
  imageUrl?: string;
  voterTitle?: string;
  zone?: string;
  section?: string;
}): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para convidar coordenadores",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem convidar coordenadores",
    };
  }

  const invitationResult = await inviteCoordinator({
    firstName: data.firstName,
    lastName: data.lastName,
    adminId: result.session.userId,
    rg: data.rg,
    cpf: data.cpf,
    address: data.address,
    cep: data.cep,
    imageUrl: data.imageUrl,
    voterTitle: data.voterTitle,
    zone: data.zone,
    section: data.section,
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

export async function deactivateCoordinatorAction(
  coordinatorId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para desativar coordenadores",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem desativar coordenadores",
    };
  }

  const deactivationResult = await deactivateCoordinator(
    coordinatorId,
    result.session.userId
  );

  if (deactivationResult.ok) {
    revalidatePath("/dashboard/coordenadores");
    await logAuditEvent({
      action: "update",
      entity: "user",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: deactivationResult.data.id,
      metadata: { operation: "deactivate_coordinator" },
    });
  }

  return deactivationResult;
}

export async function resetCoordinatorPasswordAction(
  coordinatorId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para resetar senhas",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem resetar senhas de coordenadores",
    };
  }

  const resetResult = await resetUserPassword(
    coordinatorId,
    result.session.userId
  );

  if (resetResult.ok) {
    revalidatePath("/dashboard/coordenadores");
    await logAuditEvent({
      action: "update",
      entity: "user",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: resetResult.data.id,
      metadata: { operation: "reset_password" },
    });
  }

  return resetResult;
}

export async function generateCoordinatorLinkAction(): Promise<
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

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem gerar links de coordenador",
    };
  }

  const tokenResult = await generateRegistrationToken({
    role: "coordinator",
    invitedBy: result.session.userId,
  });

  if (tokenResult.ok) {
    await logAuditEvent({
      action: "create",
      entity: "registration_token",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: tokenResult.data.token,
      metadata: { role: "coordinator" },
    });
  }

  return tokenResult;
}

export async function deactivateCoordinatorLinkAction(
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
    revalidatePath("/dashboard/coordenadores");
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

export async function listCoordinatorLinksAction(): Promise<
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

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem listar links de coordenador",
    };
  }

  return listRegistrationTokens(result.session.userId, "admin");
}

export async function deleteCoordinatorAction(
  coordinatorId: string
): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para excluir coordenadores",
    };
  }

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem excluir coordenadores",
    };
  }

  const deleteResult = await deleteCoordinator(
    coordinatorId,
    result.session.userId
  );

  if (deleteResult.ok) {
    revalidatePath("/dashboard/coordenadores");
    await logAuditEvent({
      action: "delete",
      entity: "user",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: deleteResult.data.id,
      metadata: { operation: "delete_coordinator" },
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

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem gerar links de eleitor",
    };
  }

  return generateVoterRegistrationLink(result.session.userId);
}
