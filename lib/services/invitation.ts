import { db } from "@/db/drizzle";
import {
  user,
  invitation,
  verification,
  account,
  session,
  campaign_leader,
} from "@/db/schema";
import { eq, and, gt, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ActionResult } from "@/lib/types";
import crypto from "crypto";
import { z } from "zod";

export const LEADER_DEFAULT_PASSWORD = "12345678";

export function getLeaderUsername(firstName: string, lastName: string): string {
  const normalizeName = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  return `${normalizeName(firstName)}_${normalizeName(lastName)}`;
}

export function getLeaderProvisioningState() {
  return {
    banned: false,
    banReason: null,
    mustChangePassword: true,
  } as const;
}

export enum InvitationStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REVOKED = "revoked",
}

export interface Invitation {
  id: string;
  userId: string;
  email: string;
  status: InvitationStatus;
  deliveryVersion: number;
  invitedBy: string;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InviteLeaderInput {
  firstName: string;
  lastName: string;
  adminId: string;
}

export interface AcceptInviteInput {
  token: string;
  password: string;
}

export interface CompletePasswordResetInput {
  token: string;
  newPassword: string;
}

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH);

export function getPasswordValidationError(password: unknown): string | null {
  if (
    typeof password !== "string" ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return "A senha deve ter entre 12 e 128 caracteres.";
  }

  return null;
}

export function getLockId(userId: string): bigint {
  const hash = crypto.createHash("sha256").update(userId).digest();
  const first8Bytes = hash.subarray(0, 8);
  const unsignedValue = first8Bytes.readBigUInt64BE();
  const signBit = BigInt(1) << BigInt(63);

  return unsignedValue >= signBit
    ? unsignedValue - (BigInt(1) << BigInt(64))
    : unsignedValue;
}

export async function inviteLeader(
  input: InviteLeaderInput
): Promise<ActionResult<Invitation>> {
  try {
    // Generate login from first and last name
    const login = getLeaderUsername(input.firstName, input.lastName);
    
    // Email for login (login@prefeito.local)
    const loginEmail = `${login}@prefeito.local`;
    
    // Default password
    const defaultPassword = LEADER_DEFAULT_PASSWORD;

    // Check if login email already has a pending invitation
    const [existingInvitation] = await db
      .select()
      .from(invitation)
      .where(
        and(
          eq(invitation.email, loginEmail),
          eq(invitation.status, InvitationStatus.PENDING)
        )
      )
      .limit(1);

    if (existingInvitation) {
      // Idempotent: if invitation exists, resume the invite
      return {
        ok: true,
        data: existingInvitation as Invitation,
      };
    }

    // Check if user already exists with this username.
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.username, login))
      .limit(1);

    if (existingUser) {
      // Re-enable legacy pending accounts without requiring email delivery.
      if (existingUser.banReason === "pending-invite") {
        await db
          .update(user)
          .set({
            ...getLeaderProvisioningState(),
            updatedAt: new Date(),
          })
          .where(eq(user.id, existingUser.id));

        // Resume invitation for existing user
        const [newInvitation] = await db
          .insert(invitation)
          .values({
            userId: existingUser.id,
            email: loginEmail,
            status: InvitationStatus.PENDING,
            deliveryVersion: 1,
            invitedBy: input.adminId,
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
          })
          .returning();

        return {
          ok: true,
          data: newInvitation as Invitation,
        };
      } else {
        // User exists but not banned with pending-invite
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "E-mail já está em uso",
        };
      }
    }

    // Create a usable account that is forced through password setup after login.
    const userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      email: loginEmail,
      username: login,
      name: `${input.firstName} ${input.lastName}`,
      role: "leader",
      emailVerified: true,
      ...getLeaderProvisioningState(),
    });

    // Hash password with scrypt (Better Auth format)
    const salt = crypto.randomBytes(16).toString("hex");
    const key = crypto.scryptSync(defaultPassword.normalize("NFKC"), salt, 64, {
      N: 16384,
      r: 16,
      p: 1,
      maxmem: 128 * 16384 * 16 * 2,
    });
    const hashedPassword = `${salt}:${key.toString("hex")}`;

    // Create credential account with hashed password
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      issuer: "local:credential",
      userId: userId,
      password: hashedPassword,
    });

    // Create invitation
    const [newInvitation] = await db
      .insert(invitation)
      .values({
        userId: userId,
        email: loginEmail,
        status: InvitationStatus.PENDING,
        deliveryVersion: 1,
        invitedBy: input.adminId,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      })
      .returning();

    return {
      ok: true,
      data: newInvitation as Invitation,
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao criar convite",
    };
  }
}

export async function acceptInvite(
  input: AcceptInviteInput
): Promise<ActionResult<void>> {
  return completePasswordReset({
    token: input.token,
    newPassword: input.password,
  });
}

export async function completePasswordReset(
  input: CompletePasswordResetInput
): Promise<ActionResult<void>> {
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Os dados para redefinir a senha são inválidos.",
    };
  }

  const resetInput = input as Partial<CompletePasswordResetInput>;
  const passwordError = getPasswordValidationError(resetInput.newPassword);
  if (passwordError) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: passwordError,
    };
  }

  if (typeof resetInput.token !== "string" || resetInput.token.length === 0) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Token inválido ou expirado",
    };
  }

  const identifier = `reset-password:${resetInput.token}`;

  try {
    const [verificationRecord] = await db
      .select()
      .from(verification)
      .where(
        and(
          eq(verification.identifier, identifier),
          gt(verification.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!verificationRecord) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Token inválido ou expirado",
      };
    }

    const userId = verificationRecord.value;

    const lockId = getLockId(userId);
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

      const [currentVerification] = await tx
        .select()
        .from(verification)
        .where(
          and(
            eq(verification.identifier, identifier),
            gt(verification.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!currentVerification) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Token inválido ou expirado",
        };
      }

      const [userRecord] = await tx
        .select()
        .from(user)
        .where(eq(user.id, currentVerification.value))
        .limit(1);

      if (!userRecord) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Token inválido ou expirado",
        };
      }

      await auth.api.resetPassword({
        body: {
          token: resetInput.token,
          newPassword: resetInput.newPassword as string,
        },
      });

      return { ok: true, data: undefined };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao redefinir senha",
    };
  }
}

export async function deactivateLeader(
  leaderId: string,
  adminId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    return await db.transaction(async (tx) => {
      const [admin] = await tx
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, adminId))
        .limit(1);

      if (admin?.role !== "admin") {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Apenas administradores podem desativar líderes",
        };
      }

      const [leader] = await tx
        .select({ id: user.id, role: user.role })
        .from(user)
        .where(eq(user.id, leaderId))
        .limit(1);

      if (!leader || leader.role !== "leader") {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Líder não encontrado",
        };
      }

      await tx.execute(sql`
        SELECT c."id"
        FROM "campaign" c
        INNER JOIN "campaign_leader" cl ON cl."campaignId" = c."id"
        WHERE cl."leaderId" = ${leaderId}
        ORDER BY c."id"
        FOR UPDATE OF c
      `);

      await tx.execute(sql`
        SELECT cl."id"
        FROM "campaign_leader" cl
        WHERE cl."leaderId" = ${leaderId}
        ORDER BY cl."campaignId", cl."id"
        FOR UPDATE OF cl
      `);

      await tx.execute(sql`
        SELECT u."id"
        FROM "user" u
        WHERE u."id" = ${leaderId}
        FOR UPDATE OF u
      `);

      await tx
        .update(invitation)
        .set({ status: InvitationStatus.REVOKED, revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(invitation.userId, leaderId),
            eq(invitation.status, InvitationStatus.PENDING)
          )
        );

      await tx
        .update(campaign_leader)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(campaign_leader.leaderId, leaderId));

      await tx
        .update(user)
        .set({
          banned: true,
          banReason: "deactivated",
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, leaderId));

      await tx.delete(session).where(eq(session.userId, leaderId));

      return { ok: true, data: { id: leaderId } };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao desativar líder",
    };
  }
}

export interface Leader {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean;
  banReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  invitationStatus: string | null;
}

export function getLeaderInvitationEmails(
  leaders: Array<Pick<Leader, "email">>
): string[] {
  return leaders.map((leader) => leader.email);
}

export function getLeaderInvitationStatus(
  email: string,
  invitations: Array<{ email: string; status: string }>
): string | null {
  return invitations.find((item) => item.email === email)?.status ?? null;
}

export async function listLeaders(): Promise<
  ActionResult<{
    leaders: Leader[];
    total: number;
  }>
> {
  try {
    // Get all users with role "leader"
    const leaders = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.role, "leader"));

    // Get invitations for each leader
    const leaderEmails = getLeaderInvitationEmails(leaders);
    const invitations = leaderEmails.length > 0
      ? await db
          .select()
          .from(invitation)
          .where(inArray(invitation.email, leaderEmails))
      : [];

    // Map invitations to leaders
    const leadersWithInvitations = leaders.map((leader) => {
        const invitationStatus = getLeaderInvitationStatus(leader.email, invitations);
        return {
          ...leader,
          invitationStatus,
        };
    });

    return {
      ok: true,
      data: {
        leaders: leadersWithInvitations,
        total: leadersWithInvitations.length,
      },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao listar líderes",
    };
  }
}
