import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { normalizeCpf } from "./cpf";

export async function isCpfRegistered(
  cpf: unknown,
  excludeUserId?: string
): Promise<boolean> {
  const normalized = normalizeCpf(cpf);
  if (!normalized) {
    return false;
  }

  const conditions = [eq(user.cpf, normalized)];
  if (excludeUserId) {
    conditions.push(ne(user.id, excludeUserId));
  }

  const [record] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(...conditions))
    .limit(1);

  return Boolean(record);
}