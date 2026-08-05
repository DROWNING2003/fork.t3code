import { describe, expect, it } from "vite-plus/test";

import {
  enrichSandboxInfoWithConnectionTarget,
  isSandboxUploadAllowed,
  mergeConnectedSandboxInfo,
  parseSandboxConnectionTarget,
} from "./useSandboxFileUpload";

describe("sandbox file upload target", () => {
  it("extracts the sandbox id and public domain from the connected environment URL", () => {
    expect(
      parseSandboxConnectionTarget("https://8080-sandbox-1.e2b.example.com/workspace"),
    ).toEqual({ sandboxID: "sandbox-1", domain: "e2b.example.com" });
  });

  it("ignores non-sandbox environment URLs", () => {
    expect(parseSandboxConnectionTarget("http://localhost:5733")).toBeNull();
    expect(parseSandboxConnectionTarget("https://8080-sandbox-1")).toBeNull();
  });

  it("fills a missing API domain from the connected environment", () => {
    const target = { sandboxID: "sandbox-1", domain: "e2b.example.com" } as const;
    const sandbox = {
      sandboxID: "sandbox-1",
      domain: "",
      state: "running" as const,
    };

    expect(enrichSandboxInfoWithConnectionTarget(sandbox, target).domain).toBe("e2b.example.com");
  });

  it("only allows uploads for running sandboxes", () => {
    expect(isSandboxUploadAllowed({ state: "running" })).toBe(true);
    expect(isSandboxUploadAllowed({ state: "paused" })).toBe(false);
    expect(isSandboxUploadAllowed(null)).toBe(false);
  });

  it("treats a successful connect response as running when it omits state", () => {
    const target = { sandboxID: "sandbox-1", domain: "e2b.example.com" } as const;
    const listed = {
      sandboxID: "sandbox-1",
      templateID: "template-1",
      domain: "",
      state: "paused" as const,
      startedAt: "2026-01-01T00:00:00.000Z",
      endAt: "2026-01-01T01:00:00.000Z",
      cpuCount: 2,
      memoryMB: 1024,
      diskSizeMB: 10240,
    };
    const connected = {
      sandboxID: "sandbox-1",
      envdAccessToken: "envd-token",
      trafficAccessToken: "traffic-token",
      domain: "e2b.example.com",
    };

    const result = mergeConnectedSandboxInfo(listed, connected, target);

    expect(result.state).toBe("running");
    expect(result.envdAccessToken).toBe("envd-token");
    expect(isSandboxUploadAllowed(result)).toBe(true);
  });
});
