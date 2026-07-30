import { describe, expect, it } from "vite-plus/test";

import { resolveWebSurface } from "./webSurface";

describe("resolveWebSurface", () => {
  it("uses the full surface when no mode is configured", () => {
    expect(resolveWebSurface(undefined)).toBe("full");
  });

  it("enables the sandbox surface only for the exact sandbox mode", () => {
    expect(resolveWebSurface("sandbox")).toBe("sandbox");
  });

  it.each(["SANDBOX", " sandbox ", "preview", ""])("keeps the full surface for %j", (value) => {
    expect(resolveWebSurface(value)).toBe("full");
  });
});
