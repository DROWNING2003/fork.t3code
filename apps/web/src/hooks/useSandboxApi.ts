import type { EnvironmentId } from "@t3tools/contracts";
import type { SandboxCredentials } from "@t3tools/contracts/sandbox";
import type { SandboxInfo, CodexProviderConfig } from "@t3tools/shared/sandbox";
import {
  createSandboxApi,
  detectCodexProviders,
  DEFAULT_SANDBOX_SKILLS,
} from "@t3tools/sandbox-client";
import { useCallback } from "react";
import { startSandboxT3Server, getSandboxPairingUrl } from "../lib/sandbox-client";
import { connectPairing } from "../connection/onboarding";
import { useAtomCommand } from "../state/use-atom-command";
import { projectEnvironment } from "../state/projects";
import { useProjects } from "../state/entities";
import { getAdditionalInjections } from "../lib/sandboxCredentialStore";
import { newProjectId } from "../lib/utils";
import { buildSandboxProjectCreateInput, findSandboxProject } from "../sandboxProject";

export function useSandboxApi(credentials: SandboxCredentials) {
  const api = createSandboxApi({
    apiKey: credentials.e2bApiKey,
    apiUrl: credentials.e2bApiUrl,
  });
  const connectPairingEnv = useAtomCommand(connectPairing, { reportFailure: false });
  const createProject = useAtomCommand(projectEnvironment.create, { reportFailure: false });
  const projects = useProjects();

  const connect = useCallback(
    async (sandbox: SandboxInfo): Promise<EnvironmentId> => {
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
      );

      const result = await connectPairingEnv({ pairingUrl });
      if (result._tag !== "Success") {
        throw new Error("Failed to connect to sandbox");
      }
      const environmentId = result.value as EnvironmentId;
      if (findSandboxProject(projects, environmentId) === null) {
        const createResult = await createProject({
          environmentId,
          input: buildSandboxProjectCreateInput(newProjectId()),
        });
        if (createResult._tag !== "Success") {
          throw new Error("Failed to create a project for the sandbox");
        }
      }
      return environmentId;
    },
    [api, connectPairingEnv, createProject, credentials, projects],
  );

  return { api, connect };
}
