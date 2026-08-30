"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  completeInitialPasswordChange,
  getInitialPasswordValidationError,
} from "@/lib/services/invitation";
import { ActionResult } from "@/lib/types";

export async function changeInitialPassword(
  newPassword: string
): Promise<ActionResult<void>> {
  const passwordError = getInitialPasswordValidationError(newPassword);
  if (passwordError) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: passwordError,
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

  if (session.user?.role !== "leader" && session.user?.role !== "coordinator") {
    return {
      ok: false,
      code: "FORBIDDEN",
      message: "Apenas líderes ou coordenadores precisam alterar a senha inicial.",
    };
  }

  return completeInitialPasswordChange(session.session.userId, newPassword);
}
