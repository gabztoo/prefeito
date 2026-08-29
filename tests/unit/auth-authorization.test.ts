import { describe, it, expect } from "vitest";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

describe("Auth Authorization", () => {
  describe("Public sign-up endpoint", () => {
    it("should return 404 or 405 for POST to /api/auth/sign-up/email", async () => {
      const response = await fetch(`${baseURL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
          name: "Test User",
        }),
      });

      expect([404, 405]).toContain(response.status);
    });

    it("should return 404 or 405 for GET to /api/auth/sign-up/email", async () => {
      const response = await fetch(`${baseURL}/api/auth/sign-up/email`);
      expect([404, 405]).toContain(response.status);
    });
  });

  describe("Admin endpoints", () => {
    it("should return 404 for GET to /api/auth/admin/*", async () => {
      const response = await fetch(`${baseURL}/api/auth/admin/users`);
      expect(response.status).toBe(404);
    });

    it("should return 404 for POST to /api/auth/admin/*", async () => {
      const response = await fetch(`${baseURL}/api/auth/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(404);
    });

    it("should return 404 for GET to /api/auth/admin/session", async () => {
      const response = await fetch(`${baseURL}/api/auth/admin/session`);
      expect(response.status).toBe(404);
    });

    it("should return 404 for POST to /api/auth/admin/session", async () => {
      const response = await fetch(`${baseURL}/api/auth/admin/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(404);
    });
  });

  describe("Reset password endpoint", () => {
    it("should return 404 or 405 for POST to /api/auth/reset-password", async () => {
      const response = await fetch(`${baseURL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: "test-token",
          newPassword: "newpassword123",
        }),
      });

      expect([404, 405]).toContain(response.status);
    });
  });
});