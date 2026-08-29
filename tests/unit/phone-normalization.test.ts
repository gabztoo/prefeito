import { describe, it, expect } from "vitest";
import { normalizePhone } from "@/lib/normalization";

describe("Phone Normalization", () => {
  describe("NFKC normalization", () => {
    it("should normalize Unicode NFKC", () => {
      expect(normalizePhone("１２３４５６７８９０")).toBe("1234567890");
    });

    it("should handle full-width digits", () => {
      expect(normalizePhone("１２３４５６７８９０")).toBe("1234567890");
    });
  });

  describe("Remove non-digit characters", () => {
    it("should reject letters", () => {
      expect(normalizePhone("abc1234567890")).toBe("");
    });

    it("should reject letters mixed within number", () => {
      expect(normalizePhone("12a34567890")).toBe("");
    });

    it("should remove spaces", () => {
      expect(normalizePhone("123 456 7890")).toBe("1234567890");
    });

    it("should remove punctuation", () => {
      expect(normalizePhone("(123) 456-7890")).toBe("1234567890");
    });

    it("should remove dots", () => {
      expect(normalizePhone("123.456.7890")).toBe("1234567890");
    });

    it("should remove dashes", () => {
      expect(normalizePhone("123-456-7890")).toBe("1234567890");
    });
  });

  describe("Remove country code +55/55", () => {
    it("should remove +55 prefix when remaining has 10 digits", () => {
      expect(normalizePhone("+551234567890")).toBe("1234567890");
    });

    it("should remove +55 prefix when remaining has 11 digits", () => {
      expect(normalizePhone("+5512345678901")).toBe("12345678901");
    });

    it("should remove 55 prefix when remaining has 10 digits", () => {
      expect(normalizePhone("551234567890")).toBe("1234567890");
    });

    it("should remove 55 prefix when remaining has 11 digits", () => {
      expect(normalizePhone("5512345678901")).toBe("12345678901");
    });

    it("should not remove 55 when remaining has 9 digits", () => {
      expect(normalizePhone("55123456789")).toBe("55123456789");
    });

    it("should not remove 55 when remaining has 12 digits", () => {
      expect(normalizePhone("55123456789012")).toBe("55123456789012");
    });
  });

  describe("Remove leading 0", () => {
    it("should remove leading 0 when remaining has 10 digits", () => {
      expect(normalizePhone("01234567890")).toBe("1234567890");
    });

    it("should remove leading 0 when remaining has 11 digits", () => {
      expect(normalizePhone("012345678901")).toBe("12345678901");
    });

    it("should not remove leading 0 when remaining has 9 digits", () => {
      expect(normalizePhone("0123456789")).toBe("0123456789");
    });

    it("should not remove leading 0 when remaining has 12 digits", () => {
      expect(normalizePhone("0123456789012")).toBe("0123456789012");
    });
  });

  describe("Valid phone numbers", () => {
    it("should accept 10-digit phone (landline)", () => {
      expect(normalizePhone("1234567890")).toBe("1234567890");
    });

    it("should accept 11-digit phone (mobile)", () => {
      expect(normalizePhone("12345678901")).toBe("12345678901");
    });
  });

  describe("Invalid phone numbers", () => {
    it("should reject phone with less than 10 digits", () => {
      expect(normalizePhone("123456789")).toBe("");
    });

    it("should reject phone with more than 11 digits", () => {
      expect(normalizePhone("123456789012")).toBe("");
    });

    it("should reject empty string", () => {
      expect(normalizePhone("")).toBe("");
    });

    it("should reject phone with only letters", () => {
      expect(normalizePhone("abcdefghij")).toBe("");
    });
  });

  describe("Complex cases", () => {
    it("should handle +55 (12) 91234-5678", () => {
      expect(normalizePhone("+55 (12) 91234-5678")).toBe("12912345678");
    });

    it("should handle 55 12 91234-5678", () => {
      expect(normalizePhone("55 12 91234-5678")).toBe("12912345678");
    });

    it("should handle 0 12 91234-5678", () => {
      expect(normalizePhone("0 12 91234-5678")).toBe("12912345678");
    });

    it("should handle +55 12 3456-7890", () => {
      expect(normalizePhone("+55 12 3456-7890")).toBe("1234567890");
    });
  });
});