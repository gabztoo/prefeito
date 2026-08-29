"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { invitation, user } from "@/db/schema";
import {
  completePasswordReset as completePasswordResetService,
  getPasswordValidationError,
  InvitationStatus,
} from "@/lib/services/invitation";
import type { ActionResult } from "@/lib/types";
import { and, eq } from "drizzle-orm";

const NEUTRAL_RESULT = { ok: true, data: undefined } as const satisfies ActionResult<void>;

const INVALID_RESET_INPUT: ActionResult<void> = {
  ok: false,
  code: "VALIDATION_ERROR",
  message: "Os dados para redefinir a senha são inválidos.",
};

export async function requestPasswordReset(
  email: string
): Promise<ActionResult<void>> {
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    return NEUTRAL_RESULT;
  }

  try {
    const [accountUser] = await db
      .select({
        id: user.id,
        banned: user.banned,
        banReason: user.banReason,
      })
      .from(user)
      .where(eq(user.email, normalizedEmail))
      .limit(1);

    if (!accountUser || accountUser.banned || accountUser.banReason === "pending-invite") {
      return NEUTRAL_RESULT;
    }

    const [pendingInvitation] = await db
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.userId, accountUser.id),
          eq(invitation.status, InvitationStatus.PENDING)
        )
      )
      .limit(1);

    if (pendingInvitation) {
      return NEUTRAL_RESULT;
    }

    await auth.api.requestPasswordReset({
      body: {
        email: normalizedEmail,
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/redefinir-senha`,
      },
    });
  } catch {
    // Reset requests must not reveal account existence or mail delivery state.
  }

  return NEUTRAL_RESULT;
}

export async function completePasswordReset(input: {
  token: string;
  newPassword: string;
}): Promise<ActionResult<void>> {
  if (!input || typeof input !== "object") {
    return INVALID_RESET_INPUT;
  }

  const resetInput = input as Partial<{
    token: string;
    newPassword: string;
  }>;
  const passwordError = getPasswordValidationError(resetInput.newPassword);
  if (passwordError) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: passwordError,
    };
  }

  return completePasswordResetService({
    token: resetInput.token as string,
    newPassword: resetInput.newPassword as string,
  });
}
