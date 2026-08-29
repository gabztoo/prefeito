"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  inviteLeader,
  acceptInvite,
  completePasswordReset,
} from "@/lib/services/invitation";
import { ActionResult } from "@/lib/types";

export async function inviteLeaderAction(data: {
  firstName: string;
  lastName: string;
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

  if (result.user?.role !== "admin") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas administradores podem convidar líderes",
    };
  }

  const invitationResult = await inviteLeader({
    firstName: data.firstName,
    lastName: data.lastName,
    adminId: result.session.userId,
  });

  if (!invitationResult.ok) {
    return invitationResult;
  }

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
