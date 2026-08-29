"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { invitation, user } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  InvitationStatus,
  LEADER_DEFAULT_PASSWORD,
} from "@/lib/services/invitation";
import { ActionResult } from "@/lib/types";

export async function changeInitialPassword(
  newPassword: string
): Promise<ActionResult<void>> {
  if (newPassword.length < 8 || newPassword === LEADER_DEFAULT_PASSWORD) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Escolha uma senha diferente da senha padrão com pelo menos 8 caracteres.",
    };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.session?.userId) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Sua sessão expirou. Faça login novamente.",
    };
  }

  if (session.user?.role !== "leader") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas líderes precisam alterar a senha inicial.",
    };
  }

  try {
    await auth.api.changePassword({
      headers: requestHeaders,
      body: {
        currentPassword: LEADER_DEFAULT_PASSWORD,
        newPassword,
        revokeOtherSessions: false,
      },
    });

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({
          mustChangePassword: false,
          banned: false,
          banReason: null,
          emailVerified: true,
          updatedAt: now,
        })
        .where(eq(user.id, session.session.userId));

      await tx
        .update(invitation)
        .set({
          status: InvitationStatus.ACCEPTED,
          acceptedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(invitation.userId, session.session.userId),
            eq(invitation.status, InvitationStatus.PENDING)
          )
        );
    });

    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "A senha atual não pôde ser validada. Faça login novamente com a senha padrão.",
    };
  }
}
