import { describe, expect, it } from "vitest";
import { isDisabledAuthPath } from "@/lib/auth-route-policy";

describe("Auth Authorization", () => {
  it.each([
    "/api/auth/sign-up/email",
    "/api/auth/reset-password",
    "/api/auth/reset-password/confirm",
    "/api/auth/admin/users",
    "/api/auth/admin/session",
  ])("blocks disabled endpoint %s", (pathname) => {
    expect(isDisabledAuthPath(pathname)).toBe(true);
  });

  it.each([
    "/api/auth/sign-in/email",
    "/api/auth/session",
    "/api/auth/verify-email",
  ])("allows enabled endpoint %s", (pathname) => {
    expect(isDisabledAuthPath(pathname)).toBe(false);
  });
});
