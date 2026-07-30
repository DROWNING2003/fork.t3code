import {
  type EnvdAccess,
  type SandboxInfo,
  type CodexProviderConfig,
  type SandboxSkill,
  ENVD_PORT,
  sandboxUrl,
  envdFileUrl,
  envdHeaders,
  envdFileRead,
  envdProcessStart,
  startT3Server,
  waitForT3Server,
  buildT3PairingCommand,
  readPairingUrlFromJson,
} from "@t3tools/sandbox-client";

export type { T3StartOptions as StartT3ServerOptions } from "@t3tools/sandbox-client";

const DIST_DIR = "/home/user/dist";
const TARBALL_PATH = "/home/user/t3-server-dist.tar.gz";
const TARBALL_ASSET = "/t3-server-dist.tar.gz";

export interface StartSandboxT3Options extends EnvdAccess {
  readonly domain: string | null | undefined;
  readonly fallbackDomain?: string | null;
  readonly codexProviders?: ReadonlyArray<CodexProviderConfig>;
  readonly skills?: ReadonlyArray<SandboxSkill>;
  readonly distDir?: string;
  readonly fetchImpl?: typeof fetch;
}

export async function uploadT3Bundle(
  envdBase: string,
  headers: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(TARBALL_ASSET, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();

    const url = new URL(`${envdBase}/files`);
    url.searchParams.set("path", TARBALL_PATH);
    url.searchParams.set("username", "user");

    const formData = new FormData();
    formData.append(
      "file",
      new Blob([buffer], { type: "application/gzip" }),
      "t3-server-dist.tar.gz",
    );

    const uploaded = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: headers.Authorization ?? "Basic dXNlcjo=",
        "X-Sandbox-ID": headers["X-Sandbox-ID"] ?? "",
      },
      body: formData,
      signal: AbortSignal.timeout(120_000),
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
      body: new Uint8Array(0),
      signal: AbortSignal.timeout(30_000),
    });
    return extractStarted.ok ? DIST_DIR : null;
  } catch {
    return null;
  }
}

export async function startSandboxT3Server(options: StartSandboxT3Options): Promise<void> {
  await startT3Server(options);
}

export async function getSandboxPairingUrl(
  sandboxID: string,
  domain: string | null | undefined,
  fallbackDomain?: string | null,
  access?: Pick<SandboxInfo, "envdAccessToken" | "trafficAccessToken">,
  bundlePath?: string,
): Promise<string> {
  const serverUrl = sandboxUrl(sandboxID, domain, fallbackDomain);
  if (!serverUrl) throw new Error("The sandbox API did not provide a public domain.");

  const resolvedDomain = domain ?? fallbackDomain ?? "";
  const envdBase = sandboxUrl(sandboxID, resolvedDomain, undefined, ENVD_PORT);
  if (!envdBase) throw new Error("The sandbox envd URL could not be resolved.");
  const pairingFilePath = envdFileUrl(
    sandboxID,
    domain,
    fallbackDomain,
    "/home/user/.t3/mobile-pairing.json",
  );
  const headers = envdHeaders({ sandboxID, ...access });

  await waitForT3Server(serverUrl);

  const pairingCmd = bundlePath
    ? [
        "set -eu",
        "rm -f /home/user/.t3/mobile-pairing.json /home/user/.t3/mobile-pairing.json.tmp",
        `node ${bundlePath}/bin.mjs auth pairing create --base-dir /home/user/.t3 --base-url '${serverUrl}' --ttl 15m --label mobile-sandbox --json > /home/user/.t3/mobile-pairing.json.tmp`,
        "mv /home/user/.t3/mobile-pairing.json.tmp /home/user/.t3/mobile-pairing.json",
      ].join("\n")
    : buildT3PairingCommand(serverUrl);

  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 2000));
    const issued = await envdProcessStart(envdBase, headers, pairingCmd);
    if (!issued.ok) continue;

    for (let i = 0; i < 15; i++) {
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 500));
      const pairFile = await envdFileRead(pairingFilePath, headers);
      if (!pairFile) continue;
      const url = readPairingUrlFromJson(await pairFile.text(), serverUrl);
      if (url) return url;
    }
  }
  throw new Error(`T3 Server did not issue a fresh pairing code at ${serverUrl}.`);
}
