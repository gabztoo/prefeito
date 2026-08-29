import { describe, expect, it } from "vitest";
import { passwordSchema } from "@/lib/services/invitation";

describe("password reset flow", () => {
  it("requires passwords between 12 and 128 characters", () => {
    expect(passwordSchema.safeParse("a".repeat(11)).success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(12)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(128)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(129)).success).toBe(false);
  });
});
