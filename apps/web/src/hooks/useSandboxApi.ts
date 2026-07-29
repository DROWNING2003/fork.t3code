import type { EnvironmentId } from "@t3tools/contracts";
import type { SandboxCredentials } from "@t3tools/contracts/sandbox";
import type { SandboxInfo } from "@t3tools/shared/sandbox";
import { ENVD_PORT, sandboxUrl } from "@t3tools/shared/sandbox";
import { useCallback } from "react";
import type { StartT3ServerOptions } from "../lib/sandbox-client";
import {
  createSandboxApi,
  envdHeaders,
  getSandboxPairingUrl,
  startSandboxT3Server,
  uploadT3Bundle,
} from "../lib/sandbox-client";
import { connectPairing } from "../connection/onboarding";
import { useAtomCommand } from "../state/use-atom-command";

function buildStartOptions(
  sandbox: SandboxInfo,
  credentials: SandboxCredentials,
  distDir?: string,
): StartT3ServerOptions {
  return {
    sandboxID: sandbox.sandboxID,
    domain: sandbox.domain ?? null,
    fallbackDomain: credentials.sandboxDomain,
    openAiBaseUrl: credentials.openaiBaseUrl,
    distDir,
    ...(sandbox.envdAccessToken !== undefined ? { envdAccessToken: sandbox.envdAccessToken } : {}),
    ...(sandbox.trafficAccessToken !== undefined && sandbox.trafficAccessToken !== null
      ? { trafficAccessToken: sandbox.trafficAccessToken }
      : {}),
  } as StartT3ServerOptions;
}

const TEMPLATE_SERVER_DIR = "/home/user/t3-server";

export function useSandboxApi(credentials: SandboxCredentials) {
  const api = createSandboxApi(credentials.e2bApiKey, credentials.e2bApiUrl);
  const connectPairingEnv = useAtomCommand(connectPairing, { reportFailure: false });

  const connect = useCallback(
    async (sandbox: SandboxInfo): Promise<EnvironmentId> => {
      const resolvedDomain = sandbox.domain ?? credentials.sandboxDomain ?? "";
      const envdBase = sandboxUrl(sandbox.sandboxID, resolvedDomain, undefined, ENVD_PORT);
      const headers = envdHeaders({
        sandboxID: sandbox.sandboxID,
        ...(sandbox.envdAccessToken !== undefined
          ? { envdAccessToken: sandbox.envdAccessToken }
          : {}),
        ...(sandbox.trafficAccessToken !== undefined
          ? { trafficAccessToken: sandbox.trafficAccessToken }
          : {}),
      });
      let distDir: string | null = null;
      if (envdBase) {
        distDir = await uploadT3Bundle(envdBase, headers);
      }

      const serverDistDir = distDir ?? TEMPLATE_SERVER_DIR;
      await startSandboxT3Server(buildStartOptions(sandbox, credentials, serverDistDir));

      const pairingUrl = await getSandboxPairingUrl(
        sandbox.sandboxID,
        sandbox.domain,
        credentials.sandboxDomain,
        sandbox as Pick<SandboxInfo, "envdAccessToken" | "trafficAccessToken">,
        serverDistDir,
      );

      const result = await connectPairingEnv({ pairingUrl });
      if (result._tag !== "Success") {
        throw new Error("Failed to connect to sandbox");
      }
      return result.value as EnvironmentId;
    },
    [api, connectPairingEnv, credentials],
  );

  return { api, connect };
}
