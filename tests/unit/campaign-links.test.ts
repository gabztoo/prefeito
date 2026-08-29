import { describe, expect, it } from "vitest";
import {
  buildPublicLinkPath,
  buildPublicLinkUrl,
  generatePublicCode,
  normalizeCampaignSlug,
} from "../../lib/services/campaign";

describe("campaign public links", () => {
  it("builds the public voter registration path", () => {
    expect(buildPublicLinkPath("campanha-2026", "codigo-publico")).toBe(
      "/c/campanha-2026/codigo-publico"
    );
  });

  it("builds a copyable public voter registration URL", () => {
    expect(
      buildPublicLinkUrl(
        "https://prefeito.example",
        "campanha-2026",
        "codigo-publico"
      )
    ).toBe("https://prefeito.example/c/campanha-2026/codigo-publico");
  });

  it("generates a 256-bit URL-safe public code", () => {
    const code = generatePublicCode();

    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("normalizes campaign slugs for URLs", () => {
    expect(normalizeCampaignSlug("Campanha Cidade Nova 2026")).toBe(
      "campanha-cidade-nova-2026"
    );
  });
});
