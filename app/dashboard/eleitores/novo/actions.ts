"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createVoter } from "@/lib/services/voter";
import { ActionResult } from "@/lib/types";
import { logAuditEvent } from "@/lib/services/audit";
import { revalidatePath } from "next/cache";

export async function createVoterAction(data: {
  name: string;
  motherName: string;
  phone: string;
  zone: string;
  section: string;
  voterTitle?: string;
  cep?: string;
}): Promise<ActionResult<{ id: string }>> {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Você precisa estar logado para cadastrar eleitores",
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
      message: "Apenas administradores, coordenadores ou líderes podem cadastrar eleitores",
    };
  }

  const createResult = await createVoter(
    result.session.userId,
    result.user?.role || "leader",
    {
      name: data.name,
      motherName: data.motherName,
      phone: data.phone,
      zone: data.zone,
      section: data.section,
      voterTitle: data.voterTitle,
      cep: data.cep,
    }
  );

  if (createResult.ok) {
    revalidatePath("/dashboard/eleitores");
    await logAuditEvent({
      action: "create",
      entity: "voter",
      actorId: result.session.userId,
      actorEmail: result.user?.email,
      entityId: createResult.data.id,
    });
  }

  return createResult;
}
