import { describe, it, expect } from "vitest";
import {
  computeHmac,
  computeBucketHash,
  getWindowExpiresAt,
  isHoneypotFilled,
  checkRateLimit,
} from "@/lib/rate-limit";

describe("Rate Limit", () => {
  describe("computeHmac", () => {
    it("should compute HMAC-SHA-256", () => {
      const hmac = computeHmac("test-key", "test-data");
      expect(hmac).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should return consistent results", () => {
      const hmac1 = computeHmac("test-key", "test-data");
      const hmac2 = computeHmac("test-key", "test-data");
      expect(hmac1).toBe(hmac2);
    });

    it("should return different results for different keys", () => {
      const hmac1 = computeHmac("key1", "test-data");
      const hmac2 = computeHmac("key2", "test-data");
      expect(hmac1).not.toBe(hmac2);
    });

    it("should return different results for different data", () => {
      const hmac1 = computeHmac("test-key", "data1");
      const hmac2 = computeHmac("test-key", "data2");
      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe("computeBucketHash", () => {
    it("should compute bucket hash for IP, link, and window", () => {
      const hash = computeBucketHash("192.168.1.1", "link-id", 10);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should return consistent results", () => {
      const hash1 = computeBucketHash("192.168.1.1", "link-id", 10);
      const hash2 = computeBucketHash("192.168.1.1", "link-id", 10);
      expect(hash1).toBe(hash2);
    });

    it("should return different results for different IPs", () => {
      const hash1 = computeBucketHash("192.168.1.1", "link-id", 10);
      const hash2 = computeBucketHash("192.168.1.2", "link-id", 10);
      expect(hash1).not.toBe(hash2);
    });

    it("should return different results for different links", () => {
      const hash1 = computeBucketHash("192.168.1.1", "link-id-1", 10);
      const hash2 = computeBucketHash("192.168.1.1", "link-id-2", 10);
      expect(hash1).not.toBe(hash2);
    });

    it("should return different results for different windows", () => {
      const hash1 = computeBucketHash("192.168.1.1", "link-id", 10);
      const hash2 = computeBucketHash("192.168.1.1", "link-id", 20);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("isHoneypotFilled", () => {
    it("should return true when honeypot is filled", () => {
      expect(isHoneypotFilled("some value")).toBe(true);
    });

    it("should return false when honeypot is empty", () => {
      expect(isHoneypotFilled("")).toBe(false);
    });

    it("should return false when honeypot is undefined", () => {
      expect(isHoneypotFilled(undefined)).toBe(false);
    });

    it("should return false when honeypot is null", () => {
      expect(isHoneypotFilled(null)).toBe(false);
    });

    it("should return true when honeypot has whitespace", () => {
      expect(isHoneypotFilled("  ")).toBe(true);
    });
  });

  describe("checkRateLimit", () => {
    it("should return allowed when count is below limit", () => {
      const result = checkRateLimit(1, 5);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });

    it("should return allowed when count is at limit", () => {
      const result = checkRateLimit(5, 5);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(5);
    });

    it("should return denied when count exceeds limit", () => {
      const result = checkRateLimit(6, 5);
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(6);
    });

    it("should return allowed when count is 0", () => {
      const result = checkRateLimit(0, 5);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(0);
    });
  });

  describe("getWindowExpiresAt", () => {
    it("expires at the end of the current ten-minute window", () => {
      expect(getWindowExpiresAt(123)).toEqual(new Date((123 + 1) * 10 * 60 * 1000));
    });
  });
});
