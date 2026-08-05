import { describe, expect, it } from "vite-plus/test";

import { getT3PairingUrl, startT3Server } from "./t3-orchestrator";

describe("sandbox T3 orchestration URLs", () => {
  it("starts envd through the fallback domain when the sandbox domain is empty", async () => {
    const requests: string[] = [];

    await startT3Server({
      sandboxID: "sandbox-1",
      domain: "",
      fallbackDomain: "sandbox.example.com",
      fetchImpl: async (input) => {
        requests.push(String(input));
        return new Response("{}", { status: 200 });
      },
      wait: async () => undefined,
    });

    expect(requests).toEqual([
      "https://49983-sandbox-1.sandbox.example.com/health",
      "https://49983-sandbox-1.sandbox.example.com/process.Process/Start",
    ]);
  });

  it("reads a pairing URL through the fallback-domain envd endpoint", async () => {
    const requests: string[] = [];
    const serverUrl = "https://8080-sandbox-1.sandbox.example.com";

    const pairingUrl = await getT3PairingUrl("sandbox-1", "", "sandbox.example.com", undefined, {
      fetchImpl: async (input) => {
        const url = String(input);
        requests.push(url);
        if (url === serverUrl) {
          return new Response("ready", { status: 200 });
        }
        if (url.endsWith("/process.Process/Start")) {
          return new Response("", { status: 200 });
        }
        if (url.includes("/files?")) {
          return Response.json({ pairUrl: `${serverUrl}/pair#token=fresh-token` });
        }
        return new Response("unexpected request", { status: 500 });
      },
      attemptDelayMs: 0,
      pairingPollDelayMs: 0,
    });

    expect(pairingUrl).toBe(`${serverUrl}/pair#token=fresh-token`);
    expect(requests).toEqual([
      serverUrl,
      "https://49983-sandbox-1.sandbox.example.com/process.Process/Start",
      "https://49983-sandbox-1.sandbox.example.com/files?path=%2Fhome%2Fuser%2F.t3%2Fmobile-pairing.json&username=user",
    ]);
  });
});
