export interface SandboxInfo {
  sandboxID: string;
  templateID: string;
  alias?: string | null;
  domain?: string | null;
  state: "running" | "paused";
  startedAt: string;
  endAt: string;
  cpuCount: number;
  memoryMB: number;
  diskSizeMB: number;
  envdVersion?: string;
  envdAccessToken?: string;
  trafficAccessToken?: string | null;
}

export interface SandboxCreateInput {
  templateID: string;
  timeout: number;
  autoPause?: boolean;
  envVars?: Readonly<Record<string, string>>;
  resources?: ReadonlyArray<{
    type: "git_repository";
    url: string;
    mount_path: string;
    authorization_token?: string;
  }>;
  injections?: ReadonlyArray<{
    type: "openai";
    api_key: string;
    base_url: string;
  }>;
  network?: {
    allowPublicTraffic: boolean;
  };
}

export interface SandboxCredentials {
  e2bApiKey: string;
  e2bApiUrl: string;
  sandboxDomain: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  templateID: string;
}

export const DEFAULT_TEMPLATE_ID = "4acper6ej3qpzitdqf1e";
export const DEFAULT_OPENAI_BASE_URL = "https://api.fenno.ai";
export const DEFAULT_TIMEOUT_HOURS = 3;
export const DEFAULT_T3_PORT = 8080;

export function sandboxUrl(
  sandboxID: string,
  domain: string | null | undefined,
  fallbackDomain?: string | null,
  port = DEFAULT_T3_PORT,
): string | null {
  if (!/^[a-z0-9-]+$/i.test(sandboxID) || !Number.isInteger(port) || port < 1 || port > 65_535) {
    return null;
  }

  const resolvedDomain = (domain || fallbackDomain)
    ?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  if (
    !resolvedDomain ||
    !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
      resolvedDomain,
    )
  ) {
    return null;
  }

  return `https://${port}-${sandboxID}.${resolvedDomain}`;
}
