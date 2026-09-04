import { describe, it, expect } from "vitest";
import { validateVoterData, validateName, validateZone, validateSection, validatePhone, validateBirthDate } from "@/lib/validation";
import { getVoterSearchTerms } from "@/lib/services/voter";

describe("Voter Validation", () => {
  describe("getVoterSearchTerms", () => {
    it("supports searching by name and normalized phone digits", () => {
      expect(getVoterSearchTerms("(11) 99999-9999")).toEqual({
        name: "(11) 99999-9999",
        phone: "11999999999",
      });
    });

    it("does not create a match-all phone pattern for name searches", () => {
      expect(getVoterSearchTerms("Maria Silva")).toEqual({
        name: "Maria Silva",
        phone: null,
      });
    });
  });

  describe("validateName", () => {
    it("should accept valid name", () => {
      const result = validateName("João da Silva");
      expect(result.ok).toBe(true);
    });

    it("should accept name with 2 characters", () => {
      const result = validateName("Jo");
      expect(result.ok).toBe(true);
    });

    it("should accept name with 120 characters", () => {
      const result = validateName("A".repeat(120));
      expect(result.ok).toBe(true);
    });

    it("should reject name with 1 character", () => {
      const result = validateName("J");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject name with 121 characters", () => {
      const result = validateName("A".repeat(121));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject empty name", () => {
      const result = validateName("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject name with only spaces", () => {
      const result = validateName("   ");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should normalize name", () => {
      const result = validateName("  João da Silva  ");
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe("João da Silva");
      }
    });
  });

  describe("validateZone", () => {
    it("should accept valid zone", () => {
      const result = validateZone("123");
      expect(result.ok).toBe(true);
    });

    it("should accept zone with 1 digit", () => {
      const result = validateZone("1");
      expect(result.ok).toBe(true);
    });

    it("should accept zone with 4 digits", () => {
      const result = validateZone("1234");
      expect(result.ok).toBe(true);
    });

    it("should reject zone with 5 digits", () => {
      const result = validateZone("12345");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject zone with letters", () => {
      const result = validateZone("abc");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject empty zone", () => {
      const result = validateZone("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject zone with spaces", () => {
      const result = validateZone("1 2");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("validateSection", () => {
    it("should accept valid section", () => {
      const result = validateSection("123");
      expect(result.ok).toBe(true);
    });

    it("should accept section with 1 digit", () => {
      const result = validateSection("1");
      expect(result.ok).toBe(true);
    });

    it("should accept section with 4 digits", () => {
      const result = validateSection("1234");
      expect(result.ok).toBe(true);
    });

    it("should reject section with 5 digits", () => {
      const result = validateSection("12345");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject section with letters", () => {
      const result = validateSection("abc");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject empty section", () => {
      const result = validateSection("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("validatePhone", () => {
    it("should accept valid 10-digit phone", () => {
      const result = validatePhone("1234567890");
      expect(result.ok).toBe(true);
    });

    it("should accept valid 11-digit phone", () => {
      const result = validatePhone("12345678901");
      expect(result.ok).toBe(true);
    });

    it("should reject phone with 9 digits", () => {
      const result = validatePhone("123456789");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject phone with 12 digits", () => {
      const result = validatePhone("123456789012");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject phone with letters", () => {
      const result = validatePhone("abc12345678");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject empty phone", () => {
      const result = validatePhone("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  describe("validateBirthDate", () => {
    it("should accept valid date", () => {
      const result = validateBirthDate("1990-05-15");
      expect(result.ok).toBe(true);
    });

    it("should reject invalid date format", () => {
      const result = validateBirthDate("15/05/1990");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
      }
    });

    it("should reject empty date", () => {
      const result = validateBirthDate("");
      expect(result.ok).toBe(false);
    });
  });

  describe("validateVoterData", () => {
    it("should accept valid voter data", () => {
      const result = validateVoterData({
        name: "João da Silva",
        motherName: "Maria da Silva",
        birthDate: "1990-05-15",
        zone: "123",
        section: "456",
        phone: "1234567890",
      });
      expect(result.ok).toBe(true);
    });

    it("should reject invalid name", () => {
      const result = validateVoterData({
        name: "J",
        motherName: "Maria da Silva",
        birthDate: "1990-05-15",
        zone: "123",
        section: "456",
        phone: "1234567890",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.name).toBeDefined();
      }
    });

    it("should reject invalid birthDate", () => {
      const result = validateVoterData({
        name: "João da Silva",
        motherName: "Maria da Silva",
        birthDate: "15/05/1990",
        zone: "123",
        section: "456",
        phone: "1234567890",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.birthDate).toBeDefined();
      }
    });

    it("should reject invalid zone", () => {
      const result = validateVoterData({
        name: "João da Silva",
        motherName: "Maria da Silva",
        birthDate: "1990-05-15",
        zone: "abc",
        section: "456",
        phone: "1234567890",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.zone).toBeDefined();
      }
    });

    it("should reject invalid section", () => {
      const result = validateVoterData({
        name: "João da Silva",
        motherName: "Maria da Silva",
        birthDate: "1990-05-15",
        zone: "123",
        section: "abc",
        phone: "1234567890",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.section).toBeDefined();
      }
    });

    it("should reject invalid phone", () => {
      const result = validateVoterData({
        name: "João da Silva",
        motherName: "Maria da Silva",
        birthDate: "1990-05-15",
        zone: "123",
        section: "456",
        phone: "123456789",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.phone).toBeDefined();
      }
    });

    it("should reject multiple invalid fields", () => {
      const result = validateVoterData({
        name: "J",
        motherName: "M",
        birthDate: "invalid",
        zone: "abc",
        section: "abc",
        phone: "123456789",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe("VALIDATION_ERROR");
        expect(result.fieldErrors).toBeDefined();
        expect(result.fieldErrors?.name).toBeDefined();
        expect(result.fieldErrors?.zone).toBeDefined();
        expect(result.fieldErrors?.section).toBeDefined();
        expect(result.fieldErrors?.phone).toBeDefined();
      }
    });

    it("should normalize phone in result", () => {
      const result = validateVoterData({
        name: "João da Silva",
        motherName: "Maria da Silva",
        birthDate: "1990-05-15",
        zone: "123",
        section: "456",
        phone: "+55 12 3456-7890",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.phone).toBe("1234567890");
      }
    });

    it("should normalize name in result", () => {
      const result = validateVoterData({
        name: "  João da Silva  ",
        motherName: "  Maria da Silva  ",
        birthDate: "1990-05-15",
        zone: "123",
        section: "456",
        phone: "1234567890",
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe("João da Silva");
        expect(result.data.motherName).toBe("Maria da Silva");
      }
    });
  });
});
