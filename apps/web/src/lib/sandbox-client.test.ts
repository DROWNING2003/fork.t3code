import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { getSandboxPairingUrl } from "./sandbox-client";

function decodeEnvdCommand(body: BodyInit | null | undefined): string {
  const buffer = body as ArrayBuffer;
  const length = new DataView(buffer).getUint32(1);
  const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 5, length))) as {
    readonly process: { readonly args: readonly string[] };
  };
  return payload.process.args[1] ?? "";
}

describe("getSandboxPairingUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the template T3 Server when a legacy bundle path is supplied", async () => {
    const sandboxID = "sandbox-1";
    const domain = "sandbox.test.example";
    const serverUrl = `https://8080-${sandboxID}.${domain}`;
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ pairUrl: `${serverUrl}/pair#token=fresh-token` }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchImpl);

    const getPairingUrlWithLegacyBundlePath = getSandboxPairingUrl as unknown as (
      ...args: readonly unknown[]
    ) => Promise<string>;
    await expect(
      getPairingUrlWithLegacyBundlePath(sandboxID, domain, undefined, undefined, "/home/user/dist"),
    ).resolves.toBe(`${serverUrl}/pair#token=fresh-token`);

    const command = decodeEnvdCommand(fetchImpl.mock.calls[1]?.[1]?.body);
    expect(command).toContain("node /home/user/t3-server/bin.mjs auth pairing create");
    expect(command).not.toContain("/home/user/dist");
  });
});
