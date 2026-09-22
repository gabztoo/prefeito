import { describe, expect, it } from "vitest";
import { validateVoterTitle } from "@/lib/validation";

describe("validateVoterTitle", () => {
  it("preserves all 12 title digits, including leading zeroes", () => {
    expect(validateVoterTitle("001234567890")).toEqual({
      ok: true,
      data: "001234567890",
    });
  });

  it("allows clearing the optional title", () => {
    expect(validateVoterTitle("")).toEqual({ ok: true, data: null });
  });

  it("rejects titles that are not exactly 12 digits", () => {
    expect(validateVoterTitle("12345678901")).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
      fieldErrors: { voterTitle: expect.any(Array) },
    });
    expect(validateVoterTitle("12345678901A").ok).toBe(false);
  });
});
