import type { SandboxCredentials } from "@t3tools/contracts/sandbox";
import type { DesktopBridge } from "@t3tools/contracts";

const KEYS: Record<keyof SandboxCredentials, string> = {
  e2bApiKey: "sandbox_e2b_api_key",
  e2bApiUrl: "sandbox_e2b_api_url",
  sandboxDomain: "sandbox_public_domain",
  openaiApiKey: "sandbox_openai_api_key",
  openaiBaseUrl: "sandbox_openai_base_url",
  templateID: "sandbox_template_id",
} as const;

export interface CredentialStore {
  get(): Promise<SandboxCredentials | null>;
  set(creds: SandboxCredentials): Promise<void>;
  clear(): Promise<void>;
}

function localStorageStore(): CredentialStore {
  return {
    get: async () => {
      const raw = Object.fromEntries(
        (Object.keys(KEYS) as Array<keyof SandboxCredentials>).map((key) => [
          key,
          localStorage.getItem(KEYS[key]),
        ]),
      );
      return raw.e2bApiKey && raw.openaiApiKey ? (raw as unknown as SandboxCredentials) : null;
    },
    set: async (creds) => {
      for (const [key, value] of Object.entries(creds)) {
        const storageKey = KEYS[key as keyof SandboxCredentials];
        if (value) {
          localStorage.setItem(storageKey, value);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    },
    clear: async () => {
      for (const storageKey of Object.values(KEYS)) {
        localStorage.removeItem(storageKey);
      }
    },
  };
}

let store: CredentialStore | null = null;

function resolveStore(): CredentialStore {
  if (store) return store;
  const bridge = (globalThis as { desktopBridge?: DesktopBridge }).desktopBridge;
  if (bridge?.getSandboxCredentials) {
    store = {
      get: () => bridge.getSandboxCredentials!(),
      set: (creds) => bridge.setSandboxCredentials!(creds),
      clear: () => bridge.clearSandboxCredentials!(),
    };
  } else {
    store = localStorageStore();
  }
  return store;
}

export const sandboxCredentialStore: CredentialStore = {
  get: () => resolveStore().get(),
  set: (creds) => resolveStore().set(creds),
  clear: () => resolveStore().clear(),
};
