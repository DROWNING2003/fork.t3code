import { describe, expect, it } from "vite-plus/test";

import { mergeSandboxCredentials } from "./sandboxTypes";

describe("mergeSandboxCredentials", () => {
  it("preserves optional connection credentials when saving core settings", () => {
    expect(
      mergeSandboxCredentials(
        {
          sandboxDomain: "sandbox.example.com",
          openaiApiKey: "sk-secret",
          openaiBaseUrl: "https://api.example.com",
        },
        {
          e2bApiKey: "e2b-key",
          e2bApiUrl: "https://sandbox.example.com",
          templateID: "template-id",
        },
      ),
    ).toEqual({
      e2bApiKey: "e2b-key",
      e2bApiUrl: "https://sandbox.example.com",
      sandboxDomain: "sandbox.example.com",
      openaiApiKey: "sk-secret",
      openaiBaseUrl: "https://api.example.com",
      templateID: "template-id",
    });
  });

  it("uses edited optional connection credentials when provided", () => {
    expect(
      mergeSandboxCredentials(
        {
          sandboxDomain: "old.example.com",
          openaiApiKey: "old-key",
          openaiBaseUrl: "https://old.example.com",
        },
        {
          e2bApiKey: "e2b-key",
          e2bApiUrl: "https://sandbox.example.com",
          sandboxDomain: "new.example.com",
          openaiApiKey: "new-key",
          openaiBaseUrl: "https://new.example.com",
          templateID: "template-id",
        },
      ),
    ).toMatchObject({
      sandboxDomain: "new.example.com",
      openaiApiKey: "new-key",
      openaiBaseUrl: "https://new.example.com",
    });
  });
});
