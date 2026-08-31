import { db } from "@/db/drizzle";
import { registration_token, user, account, invitation, voter } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ActionResult } from "@/lib/types";
import crypto from "crypto";
import { z } from "zod";
import { getLeaderUsername, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "./invitation";
import { normalizeCpf } from "./cpf";
import { isCpfRegistered } from "./cpf-registry";

export const PASSWORD_SCHEMA = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`)
  .max(PASSWORD_MAX_LENGTH);

export interface RegistrationToken {
  id: string;
  token: string;
  role: string;
  invitedBy: string;
  coordinatorId: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateTokenInput {
  role: "coordinator" | "leader" | "voter";
  invitedBy: string;
  coordinatorId?: string;
  leaderId?: string;
}

export async function generateRegistrationToken(
  input: GenerateTokenInput
): Promise<ActionResult<{ token: string; url: string }>> {
  try {
    const token = crypto.randomBytes(32).toString("base64url");

    const basePath =
      input.role === "coordinator"
        ? "coordenador"
        : input.role === "leader"
        ? "lider"
        : "eleitor";

    const [created] = await db
      .insert(registration_token)
      .values({
        token,
        role: input.role,
        invitedBy: input.invitedBy,
        coordinatorId: input.coordinatorId || null,
        leaderId: input.leaderId || null,
      })
      .returning();

    const url = `${basePath}/${created.token}`;

    return {
      ok: true,
      data: { token: created.token, url },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao gerar link de cadastro",
    };
  }
}

export async function generateVoterRegistrationLink(
  leaderId: string
): Promise<ActionResult<{ token: string; url: string }>> {
  return generateRegistrationToken({
    role: "voter",
    invitedBy: leaderId,
    leaderId,
  });
}

export async function getRegistrationToken(
  token: string
): Promise<
  ActionResult<{
    id: string;
    role: string;
    invitedBy: string;
    coordinatorId: string | null;
    leaderId: string | null;
    active: boolean;
    inviterName: string;
  }>
> {
  try {
    const [record] = await db
      .select({
        id: registration_token.id,
        token: registration_token.token,
        role: registration_token.role,
        invitedBy: registration_token.invitedBy,
        coordinatorId: registration_token.coordinatorId,
        leaderId: registration_token.leaderId,
        active: registration_token.active,
      })
      .from(registration_token)
      .where(eq(registration_token.token, token))
      .limit(1);

    if (!record) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Link de cadastro não encontrado",
      };
    }

    if (!record.active) {
      return {
        ok: false,
        code: "LINK_INACTIVE",
        message: "Este link de cadastro foi desativado",
      };
    }

    const [inviter] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, record.invitedBy))
      .limit(1);

    return {
      ok: true,
      data: {
        id: record.id,
        role: record.role,
        invitedBy: record.invitedBy,
        coordinatorId: record.coordinatorId,
        leaderId: record.leaderId,
        active: record.active,
        inviterName: inviter?.name || "Desconhecido",
      },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao validar link de cadastro",
    };
  }
}

export interface CompleteRegistrationInput {
  token: string;
  name: string;
  email: string;
  password: string;
  cpf?: string;
  rg?: string;
  address?: string;
  cep?: string;
  zone?: string;
  section?: string;
  voterTitle?: string;
  localAtuacao?: string;
}

export async function completeCoordinatorRegistration(
  input: CompleteRegistrationInput
): Promise<ActionResult<{ id: string; login: string; loginEmail: string }>> {
  try {
    const passwordError = getPasswordValidationError(input.password);
    if (passwordError) {
      return { ok: false, code: "VALIDATION_ERROR", message: passwordError };
    }

    const [tokenRecord] = await db
      .select()
      .from(registration_token)
      .where(
        and(
          eq(registration_token.token, input.token),
          eq(registration_token.active, true)
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.role !== "coordinator") {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Link de cadastro inválido",
      };
    }

    const login = getLeaderUsername(input.name.split(" ")[0] || input.name, input.name.split(" ").slice(-1)[0] || input.name);
    const loginEmail = `${login}@prefeito.local`;

    const normalizedCpf = normalizeCpf(input.cpf);

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, loginEmail))
      .limit(1);

    if (existingUser) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Já existe uma conta com este nome",
      };
    }

    if (normalizedCpf && (await isCpfRegistered(normalizedCpf))) {
      return {
        ok: false,
        code: "DUPLICATE_CPF",
        message: "CPF já cadastrado no sistema.",
      };
    }

    const userId = crypto.randomUUID();

    return await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        email: loginEmail,
        username: login,
        name: input.name,
        role: "coordinator",
        emailVerified: true,
        cpf: normalizedCpf,
        rg: input.rg || null,
        address: input.address || null,
        cep: input.cep || null,
        zone: input.zone || null,
        section: input.section || null,
        voterTitle: input.voterTitle || null,
        mustChangePassword: false,
        banned: false,
      });

      const salt = crypto.randomBytes(16).toString("hex");
      const key = crypto.scryptSync(input.password.normalize("NFKC"), salt, 64, {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
      });
      const hashedPassword = `${salt}:${key.toString("hex")}`;

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        issuer: "local:credential",
        userId,
        password: hashedPassword,
      });

      await tx.insert(invitation).values({
        userId,
        email: loginEmail,
        status: "accepted",
        deliveryVersion: 1,
        invitedBy: tokenRecord.invitedBy,
        acceptedAt: new Date(),
      });

      return { ok: true, data: { id: userId, login, loginEmail } };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao criar conta de coordenador",
    };
  }
}

export async function completeLeaderRegistration(
  input: CompleteRegistrationInput
): Promise<ActionResult<{ id: string; login: string; loginEmail: string }>> {
  try {
    const passwordError = getPasswordValidationError(input.password);
    if (passwordError) {
      return { ok: false, code: "VALIDATION_ERROR", message: passwordError };
    }

    const [tokenRecord] = await db
      .select()
      .from(registration_token)
      .where(
        and(
          eq(registration_token.token, input.token),
          eq(registration_token.active, true)
        )
      )
      .limit(1);

    if (!tokenRecord || tokenRecord.role !== "leader") {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Link de cadastro inválido",
      };
    }

    const login = getLeaderUsername(input.name.split(" ")[0] || input.name, input.name.split(" ").slice(-1)[0] || input.name);
    const loginEmail = `${login}@prefeito.local`;

    const normalizedCpf = normalizeCpf(input.cpf);

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, loginEmail))
      .limit(1);

    if (existingUser) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Já existe uma conta com este nome",
      };
    }

    if (normalizedCpf && (await isCpfRegistered(normalizedCpf))) {
      return {
        ok: false,
        code: "DUPLICATE_CPF",
        message: "CPF já cadastrado no sistema.",
      };
    }

    const userId = crypto.randomUUID();

    return await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        email: loginEmail,
        username: login,
        name: input.name,
        role: "leader",
        emailVerified: true,
        coordinatorId: tokenRecord.coordinatorId,
        cpf: normalizedCpf,
        address: input.address || null,
        cep: input.cep || null,
        zone: input.zone || null,
        section: input.section || null,
        voterTitle: input.voterTitle || null,
        localAtuacao: input.localAtuacao || null,
        mustChangePassword: false,
        banned: false,
      });

      const salt = crypto.randomBytes(16).toString("hex");
      const key = crypto.scryptSync(input.password.normalize("NFKC"), salt, 64, {
        N: 16384,
        r: 16,
        p: 1,
        maxmem: 128 * 16384 * 16 * 2,
      });
      const hashedPassword = `${salt}:${key.toString("hex")}`;

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        issuer: "local:credential",
        userId,
        password: hashedPassword,
      });

      await tx.insert(invitation).values({
        userId,
        email: loginEmail,
        status: "accepted",
        deliveryVersion: 1,
        invitedBy: tokenRecord.invitedBy,
        acceptedAt: new Date(),
      });

      return { ok: true, data: { id: userId, login, loginEmail } };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao criar conta de líder",
    };
  }
}

function getPasswordValidationError(password: unknown): string | null {
  if (
    typeof password !== "string" ||
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return "A senha deve ter entre 12 e 128 caracteres.";
  }
  return null;
}

export async function deactivateRegistrationToken(
  tokenId: string,
  userId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const [tokenRecord] = await db
      .select()
      .from(registration_token)
      .where(eq(registration_token.id, tokenId))
      .limit(1);

    if (!tokenRecord) {
      return {
        ok: false,
        code: "NOT_FOUND",
        message: "Link não encontrado",
      };
    }

    if (tokenRecord.invitedBy !== userId) {
      return {
        ok: false,
        code: "FORBIDDEN",
        message: "Você não tem permissão para desativar este link",
      };
    }

    await db
      .update(registration_token)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(registration_token.id, tokenId));

    return { ok: true, data: { id: tokenId } };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao desativar link",
    };
  }
}

export async function listRegistrationTokens(
  userId: string,
  role: string
): Promise<
  ActionResult<{
    tokens: Array<{
      id: string;
      token: string;
      role: string;
      coordinatorId: string | null;
      active: boolean;
      createdAt: Date;
    }>;
  }>
> {
  try {
    const conditions = [eq(registration_token.invitedBy, userId)];

    if (role === "admin") {
      conditions[0] = eq(registration_token.role, "coordinator");
    } else if (role === "coordinator") {
      conditions[0] = eq(registration_token.role, "leader");
    }

    const tokens = await db
      .select({
        id: registration_token.id,
        token: registration_token.token,
        role: registration_token.role,
        coordinatorId: registration_token.coordinatorId,
        active: registration_token.active,
        createdAt: registration_token.createdAt,
      })
      .from(registration_token)
      .where(and(...conditions));

    return {
      ok: true,
      data: { tokens },
    };
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao listar links de cadastro",
    };
  }
}

export interface VoterRegistrationInput {
  token: string;
  name: string;
  phone: string;
  zone: string;
  section: string;
  voterTitle: string;
}

export async function completeVoterRegistration(
  input: VoterRegistrationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    return await db.transaction(async (tx) => {
      const [tokenRecord] = await tx
        .select()
        .from(registration_token)
        .where(
          and(
            eq(registration_token.token, input.token),
            eq(registration_token.active, true)
          )
        )
        .limit(1);

      if (!tokenRecord || tokenRecord.role !== "voter") {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: "Link de cadastro inválido",
        };
      }

      const cleanPhone = input.phone.replace(/\D/g, "");
      if (cleanPhone.length !== 11) {
        return {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "Telefone deve conter 11 dígitos",
        };
      }

      const [existingVoter] = await tx
        .select()
        .from(voter)
        .where(eq(voter.phone, cleanPhone))
        .limit(1);

      if (existingVoter) {
        return {
          ok: false,
          code: "DUPLICATE_PHONE",
          message: "Este telefone já está cadastrado",
        };
      }

      const voterId = crypto.randomUUID();

      await tx.insert(voter).values({
        id: voterId,
        leaderId: tokenRecord.leaderId,
        name: input.name,
        phone: cleanPhone,
        zone: input.zone,
        section: input.section,
        voterTitle: input.voterTitle,
      });

      return { ok: true, data: { id: voterId } };
    });
  } catch {
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Erro ao cadastrar eleitor",
    };
  }
}
