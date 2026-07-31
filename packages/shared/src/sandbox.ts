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
  metadata?: Record<string, string>;
}

export interface SandboxInjectionBase {
  readonly type: string;
}

export interface OpenaiInjection extends SandboxInjectionBase {
  readonly type: "openai";
  readonly api_key: string;
  readonly base_url?: string;
}

export interface AnthropicInjection extends SandboxInjectionBase {
  readonly type: "anthropic";
  readonly api_key: string;
  readonly base_url?: string;
}

export interface GeminiInjection extends SandboxInjectionBase {
  readonly type: "gemini";
  readonly api_key: string;
  readonly base_url?: string;
}

export interface QiniuInjection extends SandboxInjectionBase {
  readonly type: "qiniu";
  readonly api_key: string;
}

export interface HttpInjection extends SandboxInjectionBase {
  readonly type: "http";
  readonly base_url: string;
  readonly headers?: Record<string, string>;
}

export type SandboxInjection =
  | OpenaiInjection
  | AnthropicInjection
  | GeminiInjection
  | QiniuInjection
  | HttpInjection;

export interface CodexProviderConfig {
  readonly name: string;
  readonly baseUrl: string;
  readonly envVar: string;
  readonly configKey: string;
}

const PROVIDER_PATTERNS: ReadonlyArray<{
  readonly hostPattern: RegExp;
  readonly config: CodexProviderConfig;
}> = [
  {
    hostPattern: /openai\.com$/i,
    config: {
      name: "OpenAI",
      baseUrl: "https://api.openai.com",
      envVar: "OPENAI_API_KEY",
      configKey: "requires_openai_auth",
    },
  },
  {
    hostPattern: /anthropic\.com$/i,
    config: {
      name: "Anthropic",
      baseUrl: "https://api.anthropic.com",
      envVar: "ANTHROPIC_API_KEY",
      configKey: "requires_anthropic_auth",
    },
  },
  {
    hostPattern: /googleapis\.com$/i,
    config: {
      name: "Google",
      baseUrl: "https://generativelanguage.googleapis.com",
      envVar: "GOOGLE_API_KEY",
      configKey: "requires_google_auth",
    },
  },
];

export function detectCodexProviders(
  injections: ReadonlyArray<{ readonly base_url: string }>,
): CodexProviderConfig[] {
  const seen = new Set<string>();
  const result: CodexProviderConfig[] = [];
  for (const inj of injections) {
    const host = (() => {
      try {
        return new URL(inj.base_url).hostname;
      } catch {
        return "";
      }
    })();
    if (!host) continue;
    const match = PROVIDER_PATTERNS.find((p) => p.hostPattern.test(host));
    if (match) {
      if (!seen.has(match.config.name)) {
        seen.add(match.config.name);
        result.push({ ...match.config, baseUrl: inj.base_url });
      }
    } else {
      result.push({
        name: host
          .split(".")
          .slice(-2)
          .join(".")
          .replace(/^./, (c) => c.toUpperCase()),
        baseUrl: inj.base_url,
        envVar: "OPENAI_API_KEY",
        configKey: "requires_openai_auth",
      });
    }
  }
  return result;
}

export function buildCodexAuthJson(providers: ReadonlyArray<CodexProviderConfig>): string {
  const entries: Record<string, string> = {};
  for (const p of providers) {
    entries[p.envVar] = codexReplyPlaceholder(p.envVar);
  }
  return JSON.stringify(entries);
}

function codexReplyPlaceholder(envVar: string): string {
  switch (envVar) {
    case "OPENAI_API_KEY":
      return "sk-sandbox-injection-placeholder";
    case "ANTHROPIC_API_KEY":
      return "sk-ant-sandbox-injection-placeholder";
    case "GOOGLE_API_KEY":
      return "AIza-sandbox-injection-placeholder";
    default:
      return `${envVar}-sandbox-injection-placeholder`;
  }
}

export function buildCodexConfigToml(providers: ReadonlyArray<CodexProviderConfig>): string {
  const sections = [
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
  ];
  for (const p of providers) {
    sections.push(
      `[model_providers.${p.name}]`,
      `name = ${JSON.stringify(p.name)}`,
      `base_url = ${JSON.stringify(p.baseUrl)}`,
      'wire_api = "responses"',
      `${p.configKey} = true`,
      "",
    );
  }
  return sections.join("\n");
}

export interface SandboxSkill {
  readonly name: string;
  readonly content: string;
}

export function buildSkillInstallCommands(skills: ReadonlyArray<SandboxSkill>): string[] {
  if (skills.length === 0) return [];
  const commands: string[] = [];
  commands.push(
    "mkdir -p /home/user/.codex/skills /home/user/.agents/skills /home/user/.config/opencode/skills /home/user/.opencode/skills",
  );
  for (const skill of skills) {
    const bytes = new TextEncoder().encode(skill.content);
    const encoded = bytesToBase64(bytes);
    commands.push(
      `mkdir -p /home/user/.codex/skills/${skill.name} /home/user/.agents/skills/${skill.name} /home/user/.config/opencode/skills/${skill.name} /home/user/.opencode/skills/${skill.name}`,
      `printf '%s' ${encoded} | base64 -d > /home/user/.codex/skills/${skill.name}/SKILL.md`,
      `cp /home/user/.codex/skills/${skill.name}/SKILL.md /home/user/.agents/skills/${skill.name}/SKILL.md`,
      `cp /home/user/.codex/skills/${skill.name}/SKILL.md /home/user/.config/opencode/skills/${skill.name}/SKILL.md`,
      `cp /home/user/.codex/skills/${skill.name}/SKILL.md /home/user/.opencode/skills/${skill.name}/SKILL.md`,
    );
  }
  return commands;
}

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(""));
}

export const DEFAULT_SANDBOX_SKILLS: ReadonlyArray<SandboxSkill> = [
  {
    name: "sandbox-preview-url",
    content: [
      "---",
      "name: sandbox-preview-url",
      "description: Format preview URLs using the Qiniu sandbox domain pattern. Use when an agent working inside a sandbox needs to give the user a URL to preview their work.",
      "---",
      "",
      "# Sandbox Preview URL",
      "",
      "Qiniu sandboxes expose running services at:",
      "",
      "`https://{port}-{sandboxID}.{domain}`",
      "",
      "## When to use this format",
      "",
      "Whenever you're running inside a Qiniu sandbox and need to tell the user where to look:",
      "",
      "- A web app on port 3000 -> `https://3000-{sandboxID}.{domain}`",
      "- A dev server on port 5173 -> `https://5173-{sandboxID}.{domain}`",
      "- T3 Code on port 8080 -> `https://8080-{sandboxID}.{domain}`",
      "",
      "**Never** use `localhost:PORT` for sandbox previews.",
      "",
      "## Where to get the sandboxID and domain",
      "",
      "The sandboxID comes from the sandbox API response's `sandboxID` field.",
      "The domain comes from the sandbox's `domain` field, or the configured fallback.",
      "",
      "## Validation",
      "",
      "The sandbox ID must be alphanumeric (`[a-z0-9-]+`). The domain must be a valid FQDN.",
    ].join("\n"),
  },
];

export interface SandboxCreateInput {
  templateID: string;
  timeout: number;
  autoPause?: boolean;
  envVars?: Readonly<Record<string, string>>;
  resources?: ReadonlyArray<{
    type: "github_repository";
    url: string;
    mount_path: string;
    authorization_token: string;
  }>;
  injections?: ReadonlyArray<SandboxInjection>;
  metadata?: Record<string, string>;
  network?: {
    allowPublicTraffic: boolean;
  };
}

export type { SandboxCredentials } from "@t3tools/contracts/sandbox";

export interface SandboxListResponse {
  sandboxes: ReadonlyArray<SandboxInfo>;
}

export const DEFAULT_SANDBOX_API_URL = "https://cn-yangzhou-1-sandbox.qiniuapi.com";
export const DEFAULT_SANDBOX_DOMAIN = "";
export const DEFAULT_OPENAI_BASE_URL = "https://api.fenno.ai";
export const DEFAULT_TEMPLATE_ID = "usrrhp4zsns5yyithi8a";
export const BOUNDLY_SANDBOX_METADATA = { app: "boundly" } as const;
export const DEFAULT_TIMEOUT_HOURS = 3;
export const DEFAULT_T3_PORT = 8080;
export const ENVD_PORT = 49983;

export function isSandboxUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return /^\d+-[a-z0-9]+\./.test(hostname);
  } catch {
    return false;
  }
}

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
