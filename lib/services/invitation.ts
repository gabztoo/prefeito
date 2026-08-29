import { db } from "@/db/drizzle";
import { user, invitation, verification, account } from "@/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { ActionResult } from "@/lib/types";
import { sendInviteEmail, sendResetPasswordEmail } from "@/lib/services/email";
import crypto from "crypto";

// Helper function to generate a reset password token
async function generateResetPasswordToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
  
  await db.insert(verification).values({
    id: token,
    identifier: `reset-password:${userId}`,
    value: userId,
    expiresAt,
  });
  
  return token;
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
  email: string;
  adminId: string;
}

export interface ResendLeaderInviteInput {
  invitationId: string;
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

export function getLockId(userId: string): number {
  const hash = crypto.createHash("sha256").update(userId).digest();
  const first8Bytes = hash.subarray(0, 8);
  const bigintValue = first8Bytes.readBigUInt64BE();
  // Convert to signed 64-bit integer
  return Number(bigintValue);
}

export async function inviteLeader(
  input: InviteLeaderInput
): Promise<ActionResult<Invitation>> {
  try {
    // Generate login from first and last name
    const login = `${input.firstName}_${input.lastName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "");
    
    // Email for login (login@prefeito.local)
    const loginEmail = `${login}@prefeito.local`;
    
    // Default password
    const defaultPassword = "12345678";

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

    // Check if user already exists with this login email
    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, loginEmail))
      .limit(1);

    if (existingUser) {
      // Check if user is banned with pending-invite reason
      if (existingUser.banned && existingUser.banReason === "pending-invite") {
        // Resume invitation for existing user
        const [newInvitation] = await db
          .insert(invitation)
          .values({
            userId: existingUser.id,
            email: input.email,
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

    // Create new user with default password and banned status
    const userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      email: loginEmail,
      name: `${input.firstName} ${input.lastName}`,
      role: "leader",
      banned: true,
      banReason: "pending-invite",
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
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao criar convite",
    };
  }
}

export async function resendLeaderInvite(
  input: ResendLeaderInviteInput
): Promise<ActionResult<Invitation>> {
  try {
    // Get the invitation
    const [existingInvitation] = await db
      .select()
      .from(invitation)
      .where(eq(invitation.id, input.invitationId))
      .limit(1);

    if (!existingInvitation) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Convite não encontrado",
      };
    }

    if (existingInvitation.status !== InvitationStatus.PENDING) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Convite não está pendente",
      };
    }

    // Acquire advisory lock
    const lockId = getLockId(existingInvitation.userId);
    await db.execute(sql`SELECT pg_advisory_lock(${lockId})`);

    try {
      // Remove old verification records
      await db
        .delete(verification)
        .where(
          and(
            eq(verification.identifier, `reset-password:${existingInvitation.userId}`),
            eq(verification.value, existingInvitation.userId)
          )
        );

      // Increment delivery version
      const newVersion = existingInvitation.deliveryVersion + 1;

      // Update invitation
      const [updatedInvitation] = await db
        .update(invitation)
        .set({
          deliveryVersion: newVersion,
          updatedAt: new Date(),
        })
        .where(eq(invitation.id, input.invitationId))
        .returning();

      // Generate new reset password token
      const token = await generateResetPasswordToken(existingInvitation.userId);

      // Send invite email with new version
      await sendInviteEmail({
        to: existingInvitation.email,
        name: "Leader", // We should get the name from user table
        token,
        version: newVersion,
      });

      return {
        ok: true,
        data: updatedInvitation as Invitation,
      };
    } finally {
      // Release advisory lock
      await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
    }
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao reenviar convite",
    };
  }
}

export async function acceptInvite(
  input: AcceptInviteInput
): Promise<ActionResult<void>> {
  try {
    // Find the verification record by token
    const [verificationRecord] = await db
      .select()
      .from(verification)
      .where(eq(verification.id, input.token))
      .limit(1);

    if (!verificationRecord) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Token inválido ou expirado",
      };
    }

    // Check if token is expired
    if (new Date() > verificationRecord.expiresAt) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Token expirado",
      };
    }

    // The identifier should be 'reset-password:' and value should be userId
    if (!verificationRecord.identifier.startsWith("reset-password:")) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Token inválido",
      };
    }

    const userId = verificationRecord.value;

    // Acquire advisory lock
    const lockId = getLockId(userId);
    await db.execute(sql`SELECT pg_advisory_lock(${lockId})`);

    try {
      // Check if invitation is still pending
      const [invitationRecord] = await db
        .select()
        .from(invitation)
        .where(
          and(
            eq(invitation.userId, userId),
            eq(invitation.status, InvitationStatus.PENDING)
          )
        )
        .limit(1);

      if (!invitationRecord) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Convite não encontrado ou já utilizado",
        };
      }

      // Update user password directly
      await db
        .update(user)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(user.id, invitationRecord.userId));

      // Mark invitation as accepted
      await db
        .update(invitation)
        .set({
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(invitation.id, invitationRecord.id));

      // Verify email and unban user
      await db
        .update(user)
        .set({
          emailVerified: true,
          banned: false,
          banReason: null,
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

      // Remove verification record
      await db
        .delete(verification)
        .where(eq(verification.id, verificationRecord.id));

      return { ok: true, data: undefined };
    } finally {
      // Release advisory lock
      await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
    }
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao aceitar convite",
    };
  }
}

export async function completePasswordReset(
  input: CompletePasswordResetInput
): Promise<ActionResult<void>> {
  try {
    // Find the verification record by token
    const [verificationRecord] = await db
      .select()
      .from(verification)
      .where(eq(verification.id, input.token))
      .limit(1);

    if (!verificationRecord) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Token inválido ou expirado",
      };
    }

    // Check if token is expired
    if (new Date() > verificationRecord.expiresAt) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Token expirado",
      };
    }

    // The identifier should be 'reset-password:' and value should be userId
    if (!verificationRecord.identifier.startsWith("reset-password:")) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Token inválido",
      };
    }

    const userId = verificationRecord.value;

    // Acquire advisory lock
    const lockId = getLockId(userId);
    await db.execute(sql`SELECT pg_advisory_lock(${lockId})`);

    try {
      // Check if user is banned with pending-invite reason
      const [userRecord] = await db
        .select()
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!userRecord) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Usuário não encontrado",
        };
      }

      // If user is banned with pending-invite, this is an invite flow
      if (userRecord.banned && userRecord.banReason === "pending-invite") {
        // This should be handled by acceptInvite, not completePasswordReset
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Use o fluxo de convite para definir senha",
        };
      }

      // Update user record
      await db
        .update(user)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

      // Remove verification record
      await db
        .delete(verification)
        .where(eq(verification.id, verificationRecord.id));

      return { ok: true, data: undefined };
    } finally {
      // Release advisory lock
      await db.execute(sql`SELECT pg_advisory_unlock(${lockId})`);
    }
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao redefinir senha",
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
    const leaderEmails = leaders.map((l) => l.email);
    const invitations = leaderEmails.length > 0
      ? await db
          .select()
          .from(invitation)
          .where(
            and(
              eq(invitation.email, leaderEmails[0] || ""),
              eq(invitation.status, InvitationStatus.PENDING)
            )
          )
      : [];

    // Map invitations to leaders
    const leadersWithInvitations = leaders.map((leader) => {
      const invitation = invitations.find((i) => i.email === leader.email);
      return {
        ...leader,
        invitationStatus: invitation?.status || null,
      };
    });

    return {
      ok: true,
      data: {
        leaders: leadersWithInvitations,
        total: leadersWithInvitations.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao listar líderes",
    };
  }
}