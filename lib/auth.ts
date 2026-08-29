import { db } from "@/db/drizzle";
import {
  account,
  invitation,
  session,
  user,
  verification,
  rateLimit,
} from "@/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { and, eq } from "drizzle-orm";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character
  );
}

async function sendResetPasswordEmail(data: {
  user: { id: string; email: string; name: string };
  url: string;
  token: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.EMAIL_FROM;

  if (!apiKey || !sender) {
    throw new Error("Reset email is not configured");
  }

  const [pendingInvitation] = await db
    .select({ id: invitation.id })
    .from(invitation)
    .where(
      and(
        eq(invitation.userId, data.user.id),
        eq(invitation.status, "pending")
      )
    )
    .limit(1);

  const isInvitation = Boolean(pendingInvitation);
  const subject = isInvitation
    ? "Convite para acessar o sistema"
    : "Redefinição de senha";
  const heading = isInvitation ? "Seu convite está pronto" : "Redefina sua senha";
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/redefinir-senha?token=${encodeURIComponent(data.token)}`;
  const safeUrl = escapeHtml(resetUrl);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [data.user.email],
      subject,
      html: `<p>${heading}</p><p>Olá, ${escapeHtml(data.user.name)}.</p><p><a href="${safeUrl}">Acessar o sistema</a></p><p>Este link expira em 48 horas.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error("Reset email delivery failed");
  }
}

async function completePendingInvitation(resetUserId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const [pendingInvitation] = await tx
      .select({ id: invitation.id })
      .from(invitation)
      .where(
        and(
          eq(invitation.userId, resetUserId),
          eq(invitation.status, "pending")
        )
      )
      .limit(1);

    if (!pendingInvitation) {
      return;
    }

    const now = new Date();
    await tx
      .update(user)
      .set({
        mustChangePassword: false,
        emailVerified: true,
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: now,
      })
      .where(eq(user.id, resetUserId));

    await tx
      .update(invitation)
      .set({
        status: "accepted",
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(invitation.id, pendingInvitation.id));
  });
}

export const auth = betterAuth({
  trustedOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
  allowedDevOrigins: [`${process.env.NEXT_PUBLIC_APP_URL}`],
  cookieCache: {
    enabled: false,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
      rateLimit,
    },
  }),
  plugins: [
    nextCookies(),
    username({
      displayUsername: false,
      immutableUsername: true,
      minUsernameLength: 3,
      maxUsernameLength: 50,
    }),
    admin({
      disableHttpEndpoints: true,
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
  ],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 172800,
    sendResetPassword: sendResetPasswordEmail,
    revokeSessionsOnPasswordReset: true,
    onPasswordReset: async ({ user: resetUser }) => {
      await completePendingInvitation(resetUser.id);
    },
  },
  user: {
    additionalFields: {
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
});
