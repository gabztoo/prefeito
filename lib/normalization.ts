/**
 * Normalize phone number according to SDD rules:
 * 1. Apply Unicode NFKC normalization
 * 2. Remove letters, spaces, and punctuation
 * 3. Remove +55 or 55 prefix when remaining has 10 or 11 digits
 * 4. Remove single leading 0 when remaining has 10 or 11 digits
 * 5. Return empty string if result is not 10 or 11 digits
 */
export function normalizePhone(phone: string): string {
  if (!phone) return "";

  // Step 1: Apply Unicode NFKC normalization
  let normalized = phone.normalize("NFKC");

  // Step 2: Reject letters (rejeitar letras)
  if (/[\p{L}]/u.test(normalized)) {
    return "";
  }

  // Step 3: Remove spaces and punctuation (remover espaços e pontuação)
  normalized = normalized.replace(/[^\d]/g, "");

  // Step 4: Remove 55 prefix when remaining has 10 or 11 digits
  if (normalized.startsWith("55")) {
    const withoutPrefix = normalized.slice(2);
    if (withoutPrefix.length === 10 || withoutPrefix.length === 11) {
      normalized = withoutPrefix;
    }
  }

  // Step 5: Remove single leading 0 when remaining has 10 or 11 digits
  if (normalized.startsWith("0")) {
    const withoutPrefix = normalized.slice(1);
    if (withoutPrefix.length === 10 || withoutPrefix.length === 11) {
      normalized = withoutPrefix;
    }
  }

  // Step 6: Validate final length (10 or 11 digits)
  if (normalized.length === 10 || normalized.length === 11) {
    return normalized;
  }

  return "";
}