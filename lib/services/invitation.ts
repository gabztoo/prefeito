import { db } from "@/db/drizzle";
import {
  user,
  invitation,
  verification,
  account,
  session,
  campaign_leader,
  voter,
} from "@/db/schema";
import { eq, and, gt, inArray, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { ActionResult } from "@/lib/types";
import crypto from "crypto";
import { z } from "zod";
import { hashPassword, verifyPassword } from "better-auth/crypto";

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
  coordinatorId?: string;
  voterTitle?: string;
  zone?: string;
  section?: string;
  address?: string;
  localAtuacao?: string;
}

export interface InviteCoordinatorInput {
  firstName: string;
  lastName: string;
  adminId: string;
  rg?: string;
  cpf?: string;
  address?: string;
  imageUrl?: string;
  voterTitle?: string;
  zone?: string;
  section?: string;
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

export function getInitialPasswordValidationError(
  password: unknown
): string | null {
  if (password === LEADER_DEFAULT_PASSWORD) {
    return "Escolha uma senha diferente da senha padrão com pelo menos 12 caracteres.";
  }

  return getPasswordValidationError(password);
}

export async function completeInitialPasswordChange(
  userId: string,
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

  try {
    const passwordHash = await hashPassword(newPassword);

    return await db.transaction(async (tx) => {
      await tx.execute(sql`
        SELECT c."id"
        FROM "campaign" c
        INNER JOIN "campaign_leader" cl ON cl."campaignId" = c."id"
        WHERE cl."leaderId" = ${userId}
        ORDER BY c."id"
        FOR UPDATE OF c
      `);

      await tx.execute(sql`
        SELECT cl."id"
        FROM "campaign_leader" cl
        WHERE cl."leaderId" = ${userId}
        ORDER BY cl."campaignId", cl."id"
        FOR UPDATE OF cl
      `);

      await tx.execute(sql`
        SELECT u."id"
        FROM "user" u
        WHERE u."id" = ${userId}
        FOR UPDATE OF u
      `);

      const [leader] = await tx
        .select({
          id: user.id,
          role: user.role,
          banned: user.banned,
          mustChangePassword: user.mustChangePassword,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!leader || (leader.role !== "leader" && leader.role !== "coordinator")) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Apenas líderes ou coordenadores precisam alterar a senha inicial.",
        };
      }

      if (leader.banned) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Sua conta está desativada.",
        };
      }

      if (!leader.mustChangePassword) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "A senha inicial já foi alterada.",
        };
      }

      const [credentialAccount] = await tx
        .select({ id: account.id, password: account.password })
        .from(account)
        .where(
          and(
            eq(account.userId, userId),
            eq(account.accountId, userId),
            eq(account.providerId, "credential"),
            eq(account.issuer, "local:credential")
          )
        )
        .limit(1);

      if (!credentialAccount?.password) {
        return {
          ok: false,
          code: "INTERNAL_ERROR",
          message: "Não foi possível localizar a conta de acesso.",
        };
      }

      const currentPasswordIsValid = await verifyPassword({
        hash: credentialAccount.password,
        password: LEADER_DEFAULT_PASSWORD,
      });

      if (!currentPasswordIsValid) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "A senha padrão não pôde ser validada. Faça login novamente com a senha padrão.",
        };
      }

      const now = new Date();
      await tx
        .update(account)
        .set({ password: passwordHash, updatedAt: now })
        .where(eq(account.id, credentialAccount.id));

      await tx
        .update(user)
        .set({
          mustChangePassword: false,
          banned: false,
          banReason: null,
          emailVerified: true,
          updatedAt: now,
        })
        .where(
          and(
            eq(user.id, userId),
            eq(user.banned, false),
            eq(user.mustChangePassword, true)
          )
        );

      await tx
        .update(invitation)
        .set({
          status: InvitationStatus.ACCEPTED,
          acceptedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(invitation.userId, userId),
            eq(invitation.status, InvitationStatus.PENDING)
          )
        );

      return { ok: true, data: undefined };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Não foi possível concluir a alteração da senha. Tente novamente.",
    };
  }
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
      coordinatorId: input.coordinatorId || null,
      voterTitle: input.voterTitle || null,
      zone: input.zone || null,
      section: input.section || null,
      address: input.address || null,
      localAtuacao: input.localAtuacao || null,
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
      const [requester] = await tx
        .select({ id: user.id, role: user.role })
        .from(user)
        .where(eq(user.id, adminId))
        .limit(1);

      if (requester?.role !== "admin" && requester?.role !== "coordinator") {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Apenas administradores ou coordenadores podem desativar líderes",
        };
      }

      const [leader] = await tx
        .select({ id: user.id, role: user.role, coordinatorId: user.coordinatorId })
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

      if (requester?.role === "coordinator" && leader.coordinatorId !== adminId) {
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "Você só pode desativar líderes do seu coordenadoramento",
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
  coordinatorId: string | null;
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
    const leaders = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        coordinatorId: user.coordinatorId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.role, "leader"));

    const leaderEmails = getLeaderInvitationEmails(leaders);
    const invitations = leaderEmails.length > 0
      ? await db
          .select()
          .from(invitation)
          .where(inArray(invitation.email, leaderEmails))
      : [];

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

export async function listLeadersByCoordinator(
  coordinatorId: string
): Promise<
  ActionResult<{
    leaders: Leader[];
    total: number;
  }>
> {
  try {
    const leaders = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        coordinatorId: user.coordinatorId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(
        and(
          eq(user.role, "leader"),
          eq(user.coordinatorId, coordinatorId)
        )
      );

    const leaderEmails = getLeaderInvitationEmails(leaders);
    const invitations = leaderEmails.length > 0
      ? await db
          .select()
          .from(invitation)
          .where(inArray(invitation.email, leaderEmails))
      : [];

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
      message: "Erro ao listar líderes do coordenador",
    };
  }
}

export interface Coordinator {
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

export async function listCoordinators(): Promise<
  ActionResult<{
    coordinators: Coordinator[];
    total: number;
  }>
> {
  try {
    const coordinators = await db
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
      .where(eq(user.role, "coordinator"));

    const coordinatorEmails = coordinators.map((c) => c.email);
    const invitations = coordinatorEmails.length > 0
      ? await db
          .select()
          .from(invitation)
          .where(inArray(invitation.email, coordinatorEmails))
      : [];

    const coordinatorsWithInvitations = coordinators.map((coordinator) => {
        const invitationStatus = getLeaderInvitationStatus(coordinator.email, invitations);
        return {
          ...coordinator,
          invitationStatus,
        };
    });

    return {
      ok: true,
      data: {
        coordinators: coordinatorsWithInvitations,
        total: coordinatorsWithInvitations.length,
      },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao listar coordenadores",
    };
  }
}

export async function inviteCoordinator(
  input: InviteCoordinatorInput
): Promise<ActionResult<Invitation>> {
  try {
    const login = getLeaderUsername(input.firstName, input.lastName);
    const loginEmail = `${login}@prefeito.local`;
    const defaultPassword = LEADER_DEFAULT_PASSWORD;

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
      return {
        ok: true,
        data: existingInvitation as Invitation,
      };
    }

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.username, login))
      .limit(1);

    if (existingUser) {
      if (existingUser.banReason === "pending-invite") {
        await db
          .update(user)
          .set({
            ...getLeaderProvisioningState(),
            role: "coordinator",
            rg: input.rg || null,
            cpf: input.cpf || null,
            address: input.address || null,
            imageUrl: input.imageUrl || null,
            voterTitle: input.voterTitle || null,
            zone: input.zone || null,
            section: input.section || null,
            updatedAt: new Date(),
          })
          .where(eq(user.id, existingUser.id));

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
        return {
          ok: false,
          code: "FORBIDDEN",
          message: "E-mail já está em uso",
        };
      }
    }

    const userId = crypto.randomUUID();
    await db.insert(user).values({
      id: userId,
      email: loginEmail,
      username: login,
      name: `${input.firstName} ${input.lastName}`,
      role: "coordinator",
      emailVerified: true,
      rg: input.rg || null,
      cpf: input.cpf || null,
      address: input.address || null,
      imageUrl: input.imageUrl || null,
      voterTitle: input.voterTitle || null,
      zone: input.zone || null,
      section: input.section || null,
      ...getLeaderProvisioningState(),
    });

    const salt = crypto.randomBytes(16).toString("hex");
    const key = crypto.scryptSync(defaultPassword.normalize("NFKC"), salt, 64, {
      N: 16384,
      r: 16,
      p: 1,
      maxmem: 128 * 16384 * 16 * 2,
    });
    const hashedPassword = `${salt}:${key.toString("hex")}`;

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: "credential",
      issuer: "local:credential",
      userId: userId,
      password: hashedPassword,
    });

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
      message: "Erro ao criar convite de coordenador",
    };
  }
}

export async function deactivateCoordinator(
  coordinatorId: string,
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
          message: "Apenas administradores podem desativar coordenadores",
        };
      }

      const [coordinator] = await tx
        .select({ id: user.id, role: user.role })
        .from(user)
        .where(eq(user.id, coordinatorId))
        .limit(1);

      if (!coordinator || coordinator.role !== "coordinator") {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Coordenador não encontrado",
        };
      }

      await tx.execute(sql`
        SELECT c."id"
        FROM "campaign" c
        INNER JOIN "campaign_leader" cl ON cl."campaignId" = c."id"
        INNER JOIN "user" u ON u."id" = cl."leaderId"
        WHERE u."coordinatorId" = ${coordinatorId}
        ORDER BY c."id"
        FOR UPDATE OF c
      `);

      await tx.execute(sql`
        SELECT cl."id"
        FROM "campaign_leader" cl
        INNER JOIN "user" u ON u."id" = cl."leaderId"
        WHERE u."coordinatorId" = ${coordinatorId}
        ORDER BY cl."campaignId", cl."id"
        FOR UPDATE OF cl
      `);

      await tx.execute(sql`
        SELECT u."id"
        FROM "user" u
        WHERE u."id" = ${coordinatorId}
        FOR UPDATE OF u
      `);

      await tx
        .update(invitation)
        .set({ status: InvitationStatus.REVOKED, revokedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(invitation.userId, coordinatorId),
            eq(invitation.status, InvitationStatus.PENDING)
          )
        );

      await tx.execute(sql`
        UPDATE "campaign_leader" cl
        SET "active" = false, "updatedAt" = now()
        FROM "user" u
        WHERE cl."leaderId" = u."id"
          AND u."coordinatorId" = ${coordinatorId}
      `);

      await tx
        .update(user)
        .set({
          banned: true,
          banReason: "deactivated",
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, coordinatorId));

      await tx.delete(session).where(eq(session.userId, coordinatorId));

      return { ok: true, data: { id: coordinatorId } };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao desativar coordenador",
    };
  }
}

export interface LeaderWithVoterCount {
  id: string;
  name: string;
  email: string;
  zone: string | null;
  section: string | null;
  cpf: string | null;
  phone: string | null;
  voterCount: number;
  banned: boolean;
}

export async function listLeadersWithVoterCount(
  coordinatorId: string
): Promise<
  ActionResult<{
    leaders: LeaderWithVoterCount[];
    total: number;
  }>
> {
  try {
    const leaders = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        zone: user.zone,
        section: user.section,
        cpf: user.cpf,
        banned: user.banned,
      })
      .from(user)
      .where(
        and(
          eq(user.role, "leader"),
          eq(user.coordinatorId, coordinatorId)
        )
      );

    const leadersWithCounts = await Promise.all(
      leaders.map(async (leader) => {
        const leaderLinks = await db
          .select({ id: campaign_leader.id })
          .from(campaign_leader)
          .where(
            and(
              eq(campaign_leader.leaderId, leader.id),
              eq(campaign_leader.active, true)
            )
          );

        const linkIds = leaderLinks.map((l) => l.id);

        let voterCount = 0;
        if (linkIds.length > 0) {
          const [{ total }] = await db
            .select({ total: count() })
            .from(voter)
            .where(inArray(voter.campaignLeaderId, linkIds));
          voterCount = Number(total);
        }

        return {
          ...leader,
          phone: null,
          voterCount,
        };
      })
    );

    return {
      ok: true,
      data: {
        leaders: leadersWithCounts,
        total: leadersWithCounts.length,
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

export interface CoordinatorWithHierarchy {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  zone: string | null;
  section: string | null;
  banned: boolean;
  invitationStatus: string | null;
  leaders: LeaderWithVoterCount[];
}

export async function listCoordinatorsWithHierarchy(): Promise<
  ActionResult<{
    coordinators: CoordinatorWithHierarchy[];
    total: number;
  }>
> {
  try {
    const coordinatorsResult = await listCoordinators();
    if (!coordinatorsResult.ok) {
      return coordinatorsResult;
    }

    const coordinatorsWithHierarchy = await Promise.all(
      coordinatorsResult.data.coordinators.map(async (coordinator) => {
        const leadersResult = await listLeadersWithVoterCount(coordinator.id);
        const leaders = leadersResult.ok ? leadersResult.data.leaders : [];

        return {
          ...coordinator,
          cpf: null,
          zone: null,
          section: null,
          leaders,
        };
      })
    );

    return {
      ok: true,
      data: {
        coordinators: coordinatorsWithHierarchy,
        total: coordinatorsWithHierarchy.length,
      },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao listar coordenadores com hierarquia",
    };
  }
}

export interface LeaderWithVoters {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  zone: string | null;
  section: string | null;
  banned: boolean;
  invitationStatus: string | null;
  voters: Array<{
    id: string;
    name: string;
    cpf: string | null;
    zone: string;
    section: string;
    phone: string;
  }>;
}

export async function listLeadersWithVoters(
  coordinatorId?: string
): Promise<
  ActionResult<{
    leaders: LeaderWithVoters[];
    total: number;
  }>
> {
  try {
    const conditions = [eq(user.role, "leader")];
    if (coordinatorId) {
      conditions.push(eq(user.coordinatorId, coordinatorId));
    }

    const leaders = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        zone: user.zone,
        section: user.section,
        banned: user.banned,
      })
      .from(user)
      .where(and(...conditions));

    const leaderEmails = leaders.map((l) => l.email);
    const invitations = leaderEmails.length > 0
      ? await db
          .select()
          .from(invitation)
          .where(inArray(invitation.email, leaderEmails))
      : [];

    const leadersWithVoters = await Promise.all(
      leaders.map(async (leader) => {
        const invitationStatus = invitations.find((inv) => inv.email === leader.email)?.status ?? null;

        const leaderLinks = await db
          .select({ id: campaign_leader.id })
          .from(campaign_leader)
          .where(
            and(
              eq(campaign_leader.leaderId, leader.id),
              eq(campaign_leader.active, true)
            )
          );

        const linkIds = leaderLinks.map((l) => l.id);

        let voters: Array<{
          id: string;
          name: string;
          cpf: string | null;
          zone: string;
          section: string;
          phone: string;
        }> = [];

        if (linkIds.length > 0) {
          const voterResults = await db
            .select({
              id: voter.id,
              name: voter.name,
              zone: voter.zone,
              section: voter.section,
              phone: voter.phone,
            })
            .from(voter)
            .where(inArray(voter.campaignLeaderId, linkIds))
            .limit(100);

          voters = voterResults.map((v) => ({
            ...v,
            cpf: null,
          }));
        }

        return {
          ...leader,
          cpf: leader.cpf || null,
          zone: leader.zone || null,
          section: leader.section || null,
          invitationStatus,
          voters,
        };
      })
    );

    return {
      ok: true,
      data: {
        leaders: leadersWithVoters,
        total: leadersWithVoters.length,
      },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao listar líderes com eleitores",
    };
  }
}
