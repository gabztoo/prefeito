import { describe, expect, it } from "vitest";
import { normalizeCpf, formatCpf } from "../../lib/services/cpf";

describe("CPF helpers", () => {
  it("normalizes a masked CPF to digits only", () => {
    expect(normalizeCpf("123.456.789-09")).toBe("12345678909");
  });

  it("normalizes a raw digits CPF unchanged", () => {
    expect(normalizeCpf("12345678909")).toBe("12345678909");
  });

  it("returns null for empty or short values", () => {
    expect(normalizeCpf("")).toBeNull();
    expect(normalizeCpf("123")).toBeNull();
    expect(normalizeCpf(undefined)).toBeNull();
    expect(normalizeCpf(null)).toBeNull();
  });

  it("returns null for non-string values", () => {
    expect(normalizeCpf(12345678909)).toBeNull();
  });

  it("formats digits into the masked CPF pattern", () => {
    expect(formatCpf("12345678909")).toBe("123.456.789-09");
  });

  it("formats a partially typed CPF progressively", () => {
    expect(formatCpf("123")).toBe("123");
    expect(formatCpf("1234")).toBe("123.4");
    expect(formatCpf("12345678")).toBe("123.456.78");
  });

  it("keeps at most 11 digits when formatting", () => {
    expect(formatCpf("12345678909123")).toBe("123.456.789-09");
  });
});