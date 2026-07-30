import {
  type CodexProviderConfig,
  type SandboxSkill,
  DEFAULT_T3_PORT,
  sandboxUrl,
  buildCodexAuthJson,
  buildCodexConfigToml,
  buildSkillInstallCommands,
} from "@t3tools/shared/sandbox";
import { envdHeaders, envdHealthCheck, envdProcessStart, envdFileUrl, envdFileRead } from "./envd";
import type { T3StartOptions } from "./types";

const CODEX_AUTH_PATH = "/home/user/.codex/auth.json";
const CODEX_CONFIG_PATH = "/home/user/.codex/config.toml";
const MOBILE_PAIRING_PATH = "/home/user/.t3/mobile-pairing.json";

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

const PLACEHOLDER_KEY = "sandbox-injection-placeholder";

const PROVIDER_PLACEHOLDERS: Record<string, string> = {
  OPENAI_API_KEY: "sk-sandbox-injection-placeholder",
  ANTHROPIC_API_KEY: "sk-ant-sandbox-injection-placeholder",
  GOOGLE_API_KEY: "AIza-sandbox-injection-placeholder",
  GROK_API_KEY: "xai-sandbox-injection-placeholder",
  MISTRAL_API_KEY: "mistral-sandbox-injection-placeholder",
  COHERE_API_KEY: "cohere-sandbox-injection-placeholder",
  DEEPSEEK_API_KEY: "sk-sandbox-injection-placeholder",
  XAI_API_KEY: "xai-sandbox-injection-placeholder",
};

function placeholderFor(envVar: string): string {
  return PROVIDER_PLACEHOLDERS[envVar] ?? `${envVar}-sandbox-injection-placeholder`;
}

const ALL_API_ENV_VARS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_API_KEY",
  "GROK_API_KEY",
  "MISTRAL_API_KEY",
  "COHERE_API_KEY",
  "DEEPSEEK_API_KEY",
  "XAI_API_KEY",
];

const AGENT_PLACEHOLDERS: ReadonlyArray<{ readonly path: string; readonly content: string }> = [
  {
    path: "/home/user/.codex/auth.json",
    content: JSON.stringify(
      Object.fromEntries(ALL_API_ENV_VARS.map((v) => [v, placeholderFor(v)])),
    ),
  },
  {
    path: "/home/user/.claude/credentials.json",
    content: JSON.stringify({ primaryApiKey: "sk-ant-sandbox-injection-placeholder" }),
  },
  {
    path: "/home/user/.cursor/auth.json",
    content: JSON.stringify({ apiKey: "sk-sandbox-injection-placeholder" }),
  },
  {
    path: "/home/user/.opencode/config.json",
    content: JSON.stringify({ apiKey: "sk-sandbox-injection-placeholder" }),
  },
];

function buildAgentPlaceholderCommands(): string[] {
  const cmds: string[] = [];
  for (const { path, content } of AGENT_PLACEHOLDERS) {
    const dir = path.slice(0, path.lastIndexOf("/"));
    cmds.push(
      `mkdir -p ${dir}`,
      `printf '%s\\n' ${shellQuote(content)} > ${path}.tmp`,
      `chmod 600 ${path}.tmp`,
      `if [ ! -s ${path} ]; then mv ${path}.tmp ${path}; chmod 600 ${path}; else rm -f ${path}.tmp; fi`,
    );
  }
  return cmds;
}

export function buildT3StartCommand(
  providers: ReadonlyArray<CodexProviderConfig>,
  skills: ReadonlyArray<SandboxSkill>,
  serverCommand: string,
): string {
  const lines = [
    "unset T3CODE_PAIRING_TOKEN",
    "export HOME=/home/user T3CODE_HOME=/home/user/.t3 CODEX_HOME=/home/user/.codex",
    "mkdir -p /home/user/.t3 /home/user/.codex",
    ...buildSkillInstallCommands(skills),
    "CODEX_RUNTIME_CHANGED=0",
  ];

  const authJson = buildCodexAuthJson(
    providers.length > 0
      ? providers
      : ALL_API_ENV_VARS.map(
          (envVar) =>
            ({
              name: envVar,
              baseUrl: "",
              envVar,
              configKey: "",
            }) as CodexProviderConfig,
        ),
  );
  const configToml = buildCodexConfigToml(
    providers.length > 0
      ? providers
      : [
          {
            name: "OpenAI" as const,
            baseUrl: "https://api.openai.com",
            envVar: "OPENAI_API_KEY",
            configKey: "requires_openai_auth" as const,
          },
        ],
  );
  lines.push(
    `printf '%s\\n' ${shellQuote(authJson)} > ${CODEX_AUTH_PATH}.tmp`,
    `chmod 600 ${CODEX_AUTH_PATH}.tmp`,
    `mv ${CODEX_AUTH_PATH}.tmp ${CODEX_AUTH_PATH}`,
    `chmod 600 ${CODEX_AUTH_PATH}`,
    "CODEX_RUNTIME_CHANGED=1",
    `printf '%s' ${shellQuote(configToml)} > ${CODEX_CONFIG_PATH}.tmp`,
    `chmod 600 ${CODEX_CONFIG_PATH}.tmp`,
    `if ! cmp -s ${CODEX_CONFIG_PATH}.tmp ${CODEX_CONFIG_PATH}; then`,
    `  mv ${CODEX_CONFIG_PATH}.tmp ${CODEX_CONFIG_PATH}`,
    `  chmod 600 ${CODEX_CONFIG_PATH}`,
    "  CODEX_RUNTIME_CHANGED=1",
    "else",
    `  rm -f ${CODEX_CONFIG_PATH}.tmp`,
    "fi",
  );

  lines.push(...buildAgentPlaceholderCommands());
  for (const v of ALL_API_ENV_VARS) {
    const val = placeholderFor(v);
    lines.push(`export ${v}="\${${v}:-${val}}"`);
  }

  lines.push(
    "RUNNING_PID=\"$(pgrep -f '^node .*bin\\.mjs serve --port 8080' | head -n 1 || true)\"",
    'if [ -n "$RUNNING_PID" ]; then',
    "  if [ \"$CODEX_RUNTIME_CHANGED\" = 0 ] && ! grep -qx 'Token: t3code-dev' /home/user/.t3/startup.log 2>/dev/null; then exit 0; fi",
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
    `${serverCommand} > /home/user/.t3/startup.log 2>&1 </dev/null &`,
  );
  return lines.join("\n");
}

export async function startT3Server(options: T3StartOptions): Promise<void> {
  const resolvedDomain = options.domain ?? options.fallbackDomain ?? "";
  const envdBase = sandboxUrl(options.sandboxID, resolvedDomain, undefined, 49983);
  if (!envdBase) throw new Error("The sandbox envd URL could not be resolved.");

  const fetchImpl = options.fetchImpl ?? fetch;
  const wait = options.wait ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const headers = envdHeaders(options);

  const healthy = await envdHealthCheck(envdBase, headers, { fetchImpl, wait });
  if (!healthy) throw new Error("envd is not ready");

  const serverCommand =
    options.serverCommand ??
    "nohup node /home/user/t3-server/bin.mjs serve --port 8080 --host 0.0.0.0 --base-dir /home/user/.t3 --mode web";

  const command = buildT3StartCommand(
    options.codexProviders ?? [],
    options.skills ?? [],
    serverCommand,
  );

  const started = await envdProcessStart(envdBase, headers, command, { fetchImpl });
  if (!started.ok) {
    throw new Error(`${started.status} ${await started.text().catch(() => started.statusText)}`);
  }
}

export async function waitForT3Server(
  serverUrl: string,
  options?: {
    readonly fetchImpl?: typeof fetch;
    readonly retryCount?: number;
    readonly wait?: (ms: number) => Promise<void>;
  },
): Promise<void> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const retries = options?.retryCount ?? 30;
  const wait = options?.wait ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchImpl(serverUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return;
    } catch {}
    if (i + 1 < retries) await wait(2000);
  }
  throw new Error(`T3 Server did not become ready at ${serverUrl}`);
}

export function buildT3PairingCommand(serverUrl: string): string {
  return [
    "set -eu",
    `rm -f ${MOBILE_PAIRING_PATH} ${MOBILE_PAIRING_PATH}.tmp`,
    `node /home/user/t3-server/bin.mjs auth pairing create --base-dir /home/user/.t3 --base-url '${serverUrl}' --ttl 15m --label mobile-sandbox --json > ${MOBILE_PAIRING_PATH}.tmp`,
    `mv ${MOBILE_PAIRING_PATH}.tmp ${MOBILE_PAIRING_PATH}`,
  ].join("\n");
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
    )
      return null;
    return actual.toString();
  } catch {
    return null;
  }
}

export async function getT3PairingUrl(
  sandboxID: string,
  domain: string | null | undefined,
  fallbackDomain: string | null | undefined,
  access?: { readonly envdAccessToken?: string; readonly trafficAccessToken?: string | null },
  options?: { readonly fetchImpl?: typeof fetch; readonly pairingCommand?: string },
): Promise<string> {
  const serverUrl = sandboxUrl(sandboxID, domain, fallbackDomain, DEFAULT_T3_PORT);
  if (!serverUrl) throw new Error("Could not resolve T3 server URL.");

  const resolvedDomain = domain ?? fallbackDomain ?? "";
  const envdBase = sandboxUrl(sandboxID, resolvedDomain, undefined, 49983);
  if (!envdBase) throw new Error("The sandbox envd URL could not be resolved.");

  const headers = envdHeaders({ sandboxID, ...access });
  const fetchImpl = options?.fetchImpl ?? fetch;

  await waitForT3Server(serverUrl, { fetchImpl });

  const fileUrl = envdFileUrl(sandboxID, domain, fallbackDomain, MOBILE_PAIRING_PATH);
  const pairingCmd = options?.pairingCommand ?? buildT3PairingCommand(serverUrl);
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    const issued = await envdProcessStart(envdBase, headers, pairingCmd, { fetchImpl });
    if (!issued.ok) continue;

    for (let i = 0; i < 15; i++) {
      if (i > 0) await new Promise((r) => setTimeout(r, 500));
      const pairFile = await envdFileRead(fileUrl, headers, { fetchImpl, retryCount: 1 });
      if (!pairFile) continue;
      const text = await pairFile.text();
      const url = readPairingUrlFromJson(text, serverUrl);
      if (url) return url;
    }
  }
  throw new Error(`T3 Server did not issue a fresh pairing code at ${serverUrl}.`);
}
