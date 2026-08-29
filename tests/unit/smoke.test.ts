import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Starter cleanup", () => {
  it("should not contain Polar, OpenAI, UploadThing, PostHog dependencies in package.json", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
    );
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const forbidden = [
      "@polar-sh/better-auth",
      "@polar-sh/sdk",
      "@ai-sdk/openai",
      "@aws-sdk/client-s3",
      "@neondatabase/serverless",
      "uploadthing",
      "@uploadthing/react",
      "posthog-js",
      "posthog-node",
      "@walletpass/pass-js",
      "apn",
      "balloons-js",
      "ai",
    ];
    for (const dep of forbidden) {
      expect(allDependencies).not.toHaveProperty(dep);
    }
  });

  it("should have updated Next.js, Better Auth, and Drizzle versions", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
    );
    expect(packageJson.dependencies?.["next"]).toMatch(/^15\.5\./);
    expect(packageJson.dependencies?.["better-auth"]).toMatch(/^1\.6\./);
    expect(packageJson.dependencies?.["drizzle-orm"]).toMatch(/^0\.45\./);
  });

  it("should have required scripts", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
    );
    expect(packageJson.scripts).toHaveProperty("lint");
    expect(packageJson.scripts).toHaveProperty("typecheck");
    expect(packageJson.scripts).toHaveProperty("test");
    expect(packageJson.scripts).toHaveProperty("test:integration");
    expect(packageJson.scripts).toHaveProperty("test:e2e");
  });
});
