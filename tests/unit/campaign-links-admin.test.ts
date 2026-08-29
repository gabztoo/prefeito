import { describe, expect, it } from "vitest";
import { buildWhatsAppShareUrl } from "@/lib/services/campaign";

describe("campaign link administration", () => {
  it("builds a WhatsApp share URL with a prefilled message", () => {
    const result = buildWhatsAppShareUrl(
      "https://prefeito.example/c/campanha/codigo",
      "Campanha Cidade Nova"
    );

    expect(result).toBe(
      "https://wa.me/?text=" +
        encodeURIComponent(
          "Cadastre-se na campanha Campanha Cidade Nova: https://prefeito.example/c/campanha/codigo"
        )
    );
  });
});
