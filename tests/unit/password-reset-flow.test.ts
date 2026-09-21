import { describe, expect, it } from "vitest";
import {
  getInitialPasswordValidationError,
  passwordSchema,
} from "@/lib/services/invitation";

describe("password reset flow", () => {
  it("requires passwords between 6 and 128 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(5)).success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(6)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(128)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });

  it("applies the 6-character minimum to the initial password change", () => {
    expect(getInitialPasswordValidationError("short")).toBe(
      "A senha deve ter entre 6 e 128 caracteres."
    );
  });
});
