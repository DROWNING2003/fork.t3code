import { afterEach, describe, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Vercel configuration", () => {
  it("enables Git deployments for the sandbox-only project", async () => {
    vi.stubEnv("VITE_BOUNDLY_WEB_SURFACE", "sandbox");

    const { config } = await import("../vercel");

    expect(config.git?.deploymentEnabled).toBe(true);
  });

  it("keeps the upstream hosted Web deployment disabled", async () => {
    vi.stubEnv("VITE_BOUNDLY_WEB_SURFACE", "");

    const { config } = await import("../vercel");

    expect(config.git?.deploymentEnabled).toBe(false);
  });
});
