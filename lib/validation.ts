import { normalizePhone } from "./normalization";
import { z } from "zod";

export const nameSchema = z.string().trim().min(2).max(120);
export const zoneSchema = z.string().trim().regex(/^\d{1,4}$/);
export const sectionSchema = z.string().trim().regex(/^\d{1,4}$/);
export const voterDataSchema = z.object({
  name: nameSchema,
  motherName: nameSchema,
  zone: zoneSchema,
  section: sectionSchema,
  phone: z.string(),
});

type ValidationResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: "VALIDATION_ERROR";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

/**
 * Validate name: normalized text, between 2 and 120 characters
 */
export function validateName(name: string): ValidationResult<string> {
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Nome deve ter pelo menos 2 caracteres",
      fieldErrors: { name: ["Nome deve ter pelo menos 2 caracteres"] },
    };
  }
  if (trimmed.length > 120) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Nome deve ter no máximo 120 caracteres",
      fieldErrors: { name: ["Nome deve ter no máximo 120 caracteres"] },
    };
  }
  return { ok: true, data: trimmed };
}

/**
 * Validate zone: only digits, between 1 and 4 characters
 */
export function validateZone(zone: string): ValidationResult<string> {
  const trimmed = zone.trim();
  if (!/^\d{1,4}$/.test(trimmed)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Zona deve conter apenas dígitos (1-4 caracteres)",
      fieldErrors: { zone: ["Zona deve conter apenas dígitos (1-4 caracteres)"] },
    };
  }
  return { ok: true, data: trimmed };
}

/**
 * Validate section: only digits, between 1 and 4 characters
 */
export function validateSection(section: string): ValidationResult<string> {
  const trimmed = section.trim();
  if (!/^\d{1,4}$/.test(trimmed)) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Seção deve conter apenas dígitos (1-4 caracteres)",
      fieldErrors: { section: ["Seção deve conter apenas dígitos (1-4 caracteres)"] },
    };
  }
  return { ok: true, data: trimmed };
}

/**
 * Validate phone: must be 10 or 11 digits after normalization
 */
export function validatePhone(phone: string): ValidationResult<string> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Telefone inválido. Deve conter 10 ou 11 dígitos",
      fieldErrors: { phone: ["Telefone inválido. Deve conter 10 ou 11 dígitos"] },
    };
  }
  return { ok: true, data: normalized };
}

/**
 * Validate complete voter data
 */
export function validateVoterData(data: {
  name: string;
  motherName: string;
  zone: string;
  section: string;
  phone: string;
}): ValidationResult<{
  name: string;
  motherName: string;
  zone: string;
  section: string;
  phone: string;
}> {
  const fieldErrors: Record<string, string[]> = {};
  let hasError = false;

  const nameResult = validateName(data.name);
  if (!nameResult.ok) {
    fieldErrors.name = nameResult.fieldErrors?.name || ["Nome inválido"];
    hasError = true;
  }

  const motherNameResult = validateName(data.motherName);
  if (!motherNameResult.ok) {
    fieldErrors.motherName = motherNameResult.fieldErrors?.name || ["Nome da mãe inválido"];
    hasError = true;
  }

  const zoneResult = validateZone(data.zone);
  if (!zoneResult.ok) {
    fieldErrors.zone = zoneResult.fieldErrors?.zone || ["Zona inválida"];
    hasError = true;
  }

  const sectionResult = validateSection(data.section);
  if (!sectionResult.ok) {
    fieldErrors.section = sectionResult.fieldErrors?.section || ["Seção inválida"];
    hasError = true;
  }

  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.ok) {
    fieldErrors.phone = phoneResult.fieldErrors?.phone || ["Telefone inválido"];
    hasError = true;
  }

  if (hasError) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Dados inválidos",
      fieldErrors,
    };
  }

  if (!nameResult.ok || !motherNameResult.ok || !zoneResult.ok || !sectionResult.ok || !phoneResult.ok) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Dados inválidos",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      name: nameResult.data,
      motherName: motherNameResult.data,
      zone: zoneResult.data,
      section: sectionResult.data,
      phone: phoneResult.data,
    },
  };
}