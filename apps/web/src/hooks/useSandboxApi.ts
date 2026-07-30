import type { EnvironmentId } from "@t3tools/contracts";
import type { SandboxCredentials } from "@t3tools/contracts/sandbox";
import type { SandboxInfo, CodexProviderConfig } from "@t3tools/shared/sandbox";
import {
  createSandboxApi,
  detectCodexProviders,
  DEFAULT_SANDBOX_SKILLS,
  ENVD_PORT,
  sandboxUrl,
  envdHeaders,
} from "@t3tools/sandbox-client";
import { useCallback } from "react";
import { uploadT3Bundle, startSandboxT3Server, getSandboxPairingUrl } from "../lib/sandbox-client";
import { connectPairing } from "../connection/onboarding";
import { useAtomCommand } from "../state/use-atom-command";
import { getAdditionalInjections } from "../lib/sandboxCredentialStore";

const TEMPLATE_SERVER_DIR = "/home/user/t3-server";

export function useSandboxApi(credentials: SandboxCredentials) {
  const api = createSandboxApi({
    apiKey: credentials.e2bApiKey,
    apiUrl: credentials.e2bApiUrl,
  });
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
      const additional = getAdditionalInjections();
      const allInjections = [
        ...additional,
        ...(credentials.openaiApiKey
          ? [
              {
                type: "openai" as const,
                api_key: credentials.openaiApiKey,
                base_url: credentials.openaiBaseUrl,
              },
            ]
          : []),
      ];
      const providers = detectCodexProviders(
        allInjections.flatMap((i) => {
          const url = (i as { base_url?: string }).base_url;
          return url ? [{ base_url: url }] : [];
        }),
      );
      await startSandboxT3Server({
        sandboxID: sandbox.sandboxID,
        domain: sandbox.domain,
        fallbackDomain: credentials.sandboxDomain,
        codexProviders: providers,
        skills: DEFAULT_SANDBOX_SKILLS,
        ...(sandbox.envdAccessToken !== undefined
          ? { envdAccessToken: sandbox.envdAccessToken }
          : {}),
        ...(sandbox.trafficAccessToken !== undefined && sandbox.trafficAccessToken !== null
          ? { trafficAccessToken: sandbox.trafficAccessToken }
          : {}),
      });

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
