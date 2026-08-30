"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  inviteCoordinator,
  deactivateCoordinator,
} from "@/lib/services/invitation";
import { ActionResult } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/services/audit";

export async function inviteCoordinatorAction(data: {
  firstName: string;
  lastName: string;
  rg?: string;
  cpf?: string;
  address?: string;
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
