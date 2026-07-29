import {
  ENVD_PORT,
  type SandboxCreateInput,
  type SandboxInfo,
  DEFAULT_SANDBOX_API_URL,
  sandboxUrl,
} from "@t3tools/shared/sandbox";

const SANDBOX_API_TIMEOUT_MS = 15_000;
const ENVD_RETRY_COUNT = 30;
const ENVD_RETRY_DELAY_MS = 2_000;
const MOBILE_PAIRING_PATH = "/home/user/.t3/mobile-pairing.json";
const CODEX_AUTH_PATH = "/home/user/.codex/auth.json";
const CODEX_CONFIG_PATH = "/home/user/.codex/config.toml";
const CODEX_PLACEHOLDER_API_KEY = "sandbox-injection-placeholder";
const CODEX_PLACEHOLDER_AUTH = JSON.stringify({
  OPENAI_API_KEY: CODEX_PLACEHOLDER_API_KEY,
});

export interface EnvdAccess {
  readonly sandboxID: string;
  readonly envdAccessToken?: string;
  readonly trafficAccessToken?: string | null;
}

export interface StartT3ServerOptions extends EnvdAccess {
  readonly domain: string | null | undefined;
  readonly fallbackDomain?: string | null;
  readonly openAiBaseUrl?: string | null;
  readonly distDir?: string;
  readonly fetchImpl?: typeof fetch;
  readonly wait?: (milliseconds: number) => Promise<void>;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function normalizedOpenAiBaseUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("The OpenAI Base URL must be a secure HTTPS URL.");
  }
  return url.toString().replace(/\/+$/, "");
}

function createEnvdProcessRequest(command: string): ArrayBuffer {
  const payload = new TextEncoder().encode(
    JSON.stringify({
      process: {
        cmd: "/bin/bash",
        args: ["-lc", command],
      },
      stdin: false,
    }),
  );
  const request = new ArrayBuffer(5 + payload.length);
  new DataView(request).setUint32(1, payload.length);
  new Uint8Array(request, 5).set(payload);
  return request;
}

export function envdHeaders(access: EnvdAccess): Record<string, string> {
  return {
    Authorization: "Basic dXNlcjo=",
    "Connect-Protocol-Version": "1",
    "Content-Type": "application/connect+json",
    "X-Sandbox-ID": access.sandboxID,
    ...(access.envdAccessToken ? { "X-Access-Token": access.envdAccessToken } : {}),
    ...(access.trafficAccessToken ? { "e2b-traffic-access-token": access.trafficAccessToken } : {}),
  };
}

// ─── E2B Sandbox API ──────────────────────────────────────────

export function resolveSandboxApiUrl(apiUrl?: string): string {
  return apiUrl?.trim().replace(/\/+$/, "") || DEFAULT_SANDBOX_API_URL;
}

export function buildSandboxCreateBody(input: SandboxCreateInput) {
  return {
    templateID: input.templateID,
    timeout: input.timeout,
    autoPause: input.autoPause ?? false,
    ...(input.envVars ? { envVars: input.envVars } : {}),
    ...(input.resources ? { resources: input.resources } : {}),
    ...(input.injections ? { injections: input.injections } : {}),
    ...(input.network ? { network: input.network } : {}),
  };
}

export async function parseSandboxApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  return body.trim() ? (JSON.parse(body) as T) : (undefined as T);
}

async function sandboxApiFetch<T>(
  apiKey: string,
  apiUrl: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const baseUrl = resolveSandboxApiUrl(apiUrl);
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(SANDBOX_API_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text().catch(() => res.statusText)}`);
  }
  return parseSandboxApiResponse<T>(res);
}

export function createSandboxApi(apiKey: string, apiUrl?: string) {
  const baseUrl = resolveSandboxApiUrl(apiUrl);
  const api = <T>(path: string, init?: RequestInit) =>
    sandboxApiFetch<T>(apiKey, baseUrl, path, init);

  return {
    createSandbox: (input: SandboxCreateInput): Promise<SandboxInfo> =>
      api<SandboxInfo>("/sandboxes", {
        method: "POST",
        body: JSON.stringify(buildSandboxCreateBody(input)),
      }),

    listSandboxes: (): Promise<ReadonlyArray<SandboxInfo>> =>
      api<ReadonlyArray<SandboxInfo>>("/sandboxes"),

    deleteSandbox: (sandboxID: string): Promise<void> =>
      api<void>(`/sandboxes/${encodeURIComponent(sandboxID)}`, { method: "DELETE" }),

    refreshSandbox: (sandboxID: string, durationSeconds: number): Promise<void> =>
      api<void>(`/sandboxes/${encodeURIComponent(sandboxID)}/refreshes`, {
        method: "POST",
        body: JSON.stringify({ duration: durationSeconds }),
      }),

    connectSandbox: (sandboxID: string, timeout: number): Promise<SandboxInfo> =>
      api<SandboxInfo>(`/sandboxes/${encodeURIComponent(sandboxID)}/connect`, {
        method: "POST",
        body: JSON.stringify({ timeout }),
      }),
  };
}

// ─── Envd / T3 Server Orchestration ───────────────────────────

const DIST_DIR = "/home/user/dist";
const TARBALL_PATH = "/home/user/t3-server-dist.tar.gz";
const TARBALL_ASSET = "/t3-server-dist.tar.gz";

const T3_SERVE_COMMAND = (distDir: string) =>
  `node ${distDir}/bin.mjs serve --port 8080 --host 0.0.0.0 --base-dir /home/user/.t3 --mode web > /home/user/.t3/startup.log 2>&1 </dev/null &`;

const T3_PAIRING_COMMAND = (distDir: string, serverUrl: string) =>
  `node ${distDir}/bin.mjs auth pairing create --base-dir /home/user/.t3 --base-url '${serverUrl}' --ttl 15m --label mobile-sandbox --json`;

export async function uploadT3Bundle(
  envdBase: string,
  headers: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(TARBALL_ASSET, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = new URL(`${envdBase}/files`);
    url.searchParams.set("path", TARBALL_PATH);
    url.searchParams.set("username", "user");
    const uploaded = await fetch(url.toString(), {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/octet-stream" },
      body: blob,
      signal: AbortSignal.timeout(60_000),
    });
    if (!uploaded.ok) return null;

    const extractCmd = [
      "set -eu",
      `test -d ${DIST_DIR} && rm -rf ${DIST_DIR} || true`,
      `tar -xzf ${TARBALL_PATH} -C /home/user`,
      `rm -f ${TARBALL_PATH}`,
      `test -f ${DIST_DIR}/bin.mjs`,
    ].join(" && ");
    const extractStarted = await fetch(`${envdBase}/process.Process/Start`, {
      method: "POST",
      headers,
      body: createEnvdProcessRequest(extractCmd),
      signal: AbortSignal.timeout(30_000),
    });
    return extractStarted.ok ? DIST_DIR : null;
  } catch {
    return null;
  }
}

function createT3StartCommand(openAiBaseUrl: string | null, distDir: string): string {
  const command: string[] = [
    "unset T3CODE_PAIRING_TOKEN",
    "export HOME=/home/user T3CODE_HOME=/home/user/.t3 CODEX_HOME=/home/user/.codex",
    "mkdir -p /home/user/.t3 /home/user/.codex",
    "CODEX_RUNTIME_CHANGED=0",
  ];

  if (openAiBaseUrl) {
    const codexConfig = [
      'model_provider = "OpenAI"',
      'model = "gpt-5.4"',
      'review_model = "gpt-5.4"',
      'model_reasoning_effort = "xhigh"',
      "disable_response_storage = true",
      'network_access = "enabled"',
      "windows_wsl_setup_acknowledged = true",
      "model_context_window = 1000000",
      "model_auto_compact_token_limit = 900000",
      "",
      "[model_providers.OpenAI]",
      'name = "OpenAI"',
      `base_url = ${JSON.stringify(openAiBaseUrl)}`,
      'wire_api = "responses"',
      "requires_openai_auth = true",
      "",
    ].join("\n");
    command.push(
      `if [ ! -s ${CODEX_AUTH_PATH} ]; then`,
      `  printf '%s\\n' ${shellQuote(CODEX_PLACEHOLDER_AUTH)} > ${CODEX_AUTH_PATH}.tmp`,
      `  chmod 600 ${CODEX_AUTH_PATH}.tmp`,
      `  mv ${CODEX_AUTH_PATH}.tmp ${CODEX_AUTH_PATH}`,
      `  chmod 600 ${CODEX_AUTH_PATH}`,
      "  CODEX_RUNTIME_CHANGED=1",
      "fi",
      `printf '%s' ${shellQuote(codexConfig)} > ${CODEX_CONFIG_PATH}.tmp`,
      `chmod 600 ${CODEX_CONFIG_PATH}.tmp`,
      `if ! cmp -s ${CODEX_CONFIG_PATH}.tmp ${CODEX_CONFIG_PATH}; then`,
      `  mv ${CODEX_CONFIG_PATH}.tmp ${CODEX_CONFIG_PATH}`,
      `  chmod 600 ${CODEX_CONFIG_PATH}`,
      "  CODEX_RUNTIME_CHANGED=1",
      "else",
      `  rm -f ${CODEX_CONFIG_PATH}.tmp`,
      "fi",
      `export OPENAI_API_KEY=${shellQuote(CODEX_PLACEHOLDER_API_KEY)}`,
      `export OPENAI_BASE_URL=${shellQuote(openAiBaseUrl)}`,
    );
  }

  command.push(
    `RUNNING_PID=\"$(pgrep -f '^node .*/t3-bundle\\.mjs serve --port 8080' | head -n 1 || true)\"`,
    'if [ -n "$RUNNING_PID" ]; then',
  );

  if (openAiBaseUrl) {
    command.push(
      `  if [ "$CODEX_RUNTIME_CHANGED" = 0 ] && tr '\\0' '\\n' < "/proc/$RUNNING_PID/environ" | grep -Fqx ${shellQuote(`OPENAI_BASE_URL=${openAiBaseUrl}`)} && ! grep -qx 'Token: t3code-dev' /home/user/.t3/startup.log 2>/dev/null; then exit 0; fi`,
    );
  } else {
    command.push(
      "  if ! grep -qx 'Token: t3code-dev' /home/user/.t3/startup.log 2>/dev/null; then exit 0; fi",
    );
  }

  command.push(
    '  kill "$RUNNING_PID"',
    "  WAIT_ATTEMPTS=0",
    '  while kill -0 "$RUNNING_PID" 2>/dev/null && [ "$WAIT_ATTEMPTS" -lt 50 ]; do',
    "    sleep 0.1",
    "    WAIT_ATTEMPTS=$((WAIT_ATTEMPTS + 1))",
    "  done",
    '  if kill -0 "$RUNNING_PID" 2>/dev/null; then',
    '    kill -KILL "$RUNNING_PID"',
    "    WAIT_ATTEMPTS=0",
    '    while kill -0 "$RUNNING_PID" 2>/dev/null && [ "$WAIT_ATTEMPTS" -lt 20 ]; do',
    "      sleep 0.1",
    "      WAIT_ATTEMPTS=$((WAIT_ATTEMPTS + 1))",
    "    done",
    "  fi",
    '  if kill -0 "$RUNNING_PID" 2>/dev/null; then exit 1; fi',
    "fi",
    T3_SERVE_COMMAND(distDir),
  );
  return command.join("\n");
}

function createT3StartRequest(openAiBaseUrl?: string | null, distDir = DIST_DIR): ArrayBuffer {
  return createEnvdProcessRequest(
    createT3StartCommand(normalizedOpenAiBaseUrl(openAiBaseUrl), distDir),
  );
}

function createT3PairingRequest(serverUrl: string, distDir = DIST_DIR): ArrayBuffer {
  const command = [
    "set -eu",
    `rm -f ${MOBILE_PAIRING_PATH} ${MOBILE_PAIRING_PATH}.tmp`,
    `${T3_PAIRING_COMMAND(distDir, serverUrl)} > ${MOBILE_PAIRING_PATH}.tmp`,
    `mv ${MOBILE_PAIRING_PATH}.tmp ${MOBILE_PAIRING_PATH}`,
  ].join("\n");
  return createEnvdProcessRequest(command);
}

export async function startSandboxT3Server(options: StartT3ServerOptions): Promise<void> {
  const envdBase = sandboxUrl(options.sandboxID, options.domain, options.fallbackDomain, ENVD_PORT);
  if (!envdBase) throw new Error("The sandbox envd URL could not be resolved.");

  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.wait ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const headers = envdHeaders(options);
  let lastError = "envd is not ready";

  for (let attempt = 0; attempt < ENVD_RETRY_COUNT; attempt++) {
    try {
      const health = await fetchImpl(`${envdBase}/health`, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(3_000),
      });
      if (!health.ok) {
        lastError = `${health.status} ${await health.text().catch(() => health.statusText)}`;
      } else {
        const started = await fetchImpl(`${envdBase}/process.Process/Start`, {
          method: "POST",
          headers,
          body: createT3StartRequest(options.openAiBaseUrl, options.distDir),
          signal: AbortSignal.timeout(SANDBOX_API_TIMEOUT_MS),
        });
        if (started.ok) return;
        lastError = `${started.status} ${await started.text().catch(() => started.statusText)}`;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await wait(ENVD_RETRY_DELAY_MS);
  }

  throw new Error(`Could not start T3 Server through envd: ${lastError}`);
}

export async function waitForT3Server(
  serverUrl: string,
  options?: {
    readonly fetchImpl?: typeof fetch;
    readonly wait?: (milliseconds: number) => Promise<void>;
    readonly retryCount?: number;
  },
): Promise<void> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const wait = options?.wait ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const retryCount = options?.retryCount ?? 30;
  let lastStatus = "unreachable";

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const response = await fetchImpl(serverUrl, {
        signal: AbortSignal.timeout(3_000),
      });
      if (response.ok) return;
      lastStatus = `${response.status} ${response.statusText}`.trim();
    } catch (error) {
      lastStatus = error instanceof Error ? error.message : String(error);
    }
    if (attempt + 1 < retryCount) await wait(2_000);
  }

  throw new Error(`T3 Server did not become ready at ${serverUrl}: ${lastStatus}`);
}

export function readPairingUrlFromJson(value: string, serverUrl: string): string | null {
  try {
    const parsed = JSON.parse(value) as { readonly pairUrl?: unknown };
    if (typeof parsed.pairUrl !== "string") return null;
    const expected = new URL(serverUrl);
    const actual = new URL(parsed.pairUrl);
    if (
      actual.origin !== expected.origin ||
      actual.pathname !== "/pair" ||
      !new URLSearchParams(actual.hash.slice(1)).get("token")
    ) {
      return null;
    }
    return actual.toString();
  } catch {
    return null;
  }
}

export async function getSandboxPairingUrl(
  sandboxID: string,
  domain: string | null | undefined,
  fallbackDomain?: string | null,
  access?: Pick<SandboxInfo, "envdAccessToken" | "trafficAccessToken">,
  bundlePath?: string,
): Promise<string> {
  const serverUrl = sandboxUrl(sandboxID, domain, fallbackDomain);
  if (!serverUrl) {
    throw new Error(
      "The sandbox API did not provide a public domain. Set Sandbox Public Domain in Sandbox Credentials.",
    );
  }
  const resolvedDomain = domain ?? fallbackDomain ?? "";
  const envdBase = sandboxUrl(sandboxID, resolvedDomain, undefined, ENVD_PORT);
  if (!envdBase) throw new Error("The sandbox envd URL could not be resolved.");
  const pairingFilePath = sandboxFileUrl(sandboxID, resolvedDomain);
  const headers = envdHeaders({ sandboxID, ...access });

  await waitForT3Server(serverUrl);

  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2_000));

    const issued = await fetch(`${envdBase}/process.Process/Start`, {
      method: "POST",
      headers,
      body: createT3PairingRequest(serverUrl, bundlePath),
      signal: AbortSignal.timeout(SANDBOX_API_TIMEOUT_MS),
    });
    if (!issued.ok) continue;

    for (let i = 0; i < 15; i++) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const log = await fetch(pairingFilePath, {
          headers,
          signal: AbortSignal.timeout(3000),
        });
        if (!log.ok) continue;

        const pairingUrl = readPairingUrlFromJson(await log.text(), serverUrl);
        if (pairingUrl) return pairingUrl;
      } catch {}
    }
  }

  throw new Error(`T3 Server did not issue a fresh pairing code at ${serverUrl}.`);
}

function sandboxFileUrl(sandboxID: string, domain: string): string {
  const envdUrl = sandboxUrl(sandboxID, domain, undefined, ENVD_PORT);
  if (!envdUrl) throw new Error("The sandbox envd URL could not be resolved.");

  const url = new URL(`${envdUrl}/files`);
  url.searchParams.set("path", MOBILE_PAIRING_PATH);
  url.searchParams.set("username", "user");
  return url.toString();
}
