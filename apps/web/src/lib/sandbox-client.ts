import { type SandboxInfo, getT3PairingUrl, startT3Server } from "@t3tools/sandbox-client";

export type { T3StartOptions as StartT3ServerOptions } from "@t3tools/sandbox-client";
export { startT3Server as startSandboxT3Server };

export async function getSandboxPairingUrl(
  sandboxID: string,
  domain: string | null | undefined,
  fallbackDomain?: string | null,
  access?: Pick<SandboxInfo, "envdAccessToken" | "trafficAccessToken">,
): Promise<string> {
  return getT3PairingUrl(sandboxID, domain, fallbackDomain, access);
}
