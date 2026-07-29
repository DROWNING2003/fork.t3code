import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_TEMPLATE_ID,
  type SandboxCredentials,
} from "./sandboxTypes";

const KEYS = {
  e2bApiKey: "sandbox_e2b_api_key",
  e2bApiUrl: "sandbox_e2b_api_url",
  sandboxDomain: "sandbox_public_domain",
  openaiApiKey: "sandbox_openai_api_key",
  openaiBaseUrl: "sandbox_openai_base_url",
  templateID: "sandbox_template_id",
} as const;

export function useSandboxCredentials() {
  const [credentials, setCredentials] = useState<Partial<SandboxCredentials>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(KEYS.e2bApiKey),
      SecureStore.getItemAsync(KEYS.e2bApiUrl),
      SecureStore.getItemAsync(KEYS.sandboxDomain),
      SecureStore.getItemAsync(KEYS.openaiApiKey),
      SecureStore.getItemAsync(KEYS.openaiBaseUrl),
      SecureStore.getItemAsync(KEYS.templateID),
    ]).then(([e2bApiKey, e2bApiUrl, sandboxDomain, openaiApiKey, openaiBaseUrl, templateID]) => {
      setCredentials({
        e2bApiKey: e2bApiKey ?? "",
        e2bApiUrl: e2bApiUrl ?? "",
        sandboxDomain: sandboxDomain ?? "",
        openaiApiKey: openaiApiKey ?? "",
        openaiBaseUrl: openaiBaseUrl ?? DEFAULT_OPENAI_BASE_URL,
        templateID: templateID ?? DEFAULT_TEMPLATE_ID,
      });
      setLoaded(true);
    });
  }, []);

  const saveCredentials = useCallback(async (input: Partial<SandboxCredentials>) => {
    const updates: Array<Promise<void>> = [];
    if (input.e2bApiKey !== undefined) {
      if (input.e2bApiKey) {
        updates.push(SecureStore.setItemAsync(KEYS.e2bApiKey, input.e2bApiKey));
      } else {
        updates.push(SecureStore.deleteItemAsync(KEYS.e2bApiKey));
      }
    }
    if (input.e2bApiUrl !== undefined) {
      if (input.e2bApiUrl) {
        updates.push(SecureStore.setItemAsync(KEYS.e2bApiUrl, input.e2bApiUrl));
      } else {
        updates.push(SecureStore.deleteItemAsync(KEYS.e2bApiUrl));
      }
    }
    if (input.sandboxDomain !== undefined) {
      if (input.sandboxDomain) {
        updates.push(SecureStore.setItemAsync(KEYS.sandboxDomain, input.sandboxDomain));
      } else {
        updates.push(SecureStore.deleteItemAsync(KEYS.sandboxDomain));
      }
    }
    if (input.openaiApiKey !== undefined) {
      if (input.openaiApiKey) {
        updates.push(SecureStore.setItemAsync(KEYS.openaiApiKey, input.openaiApiKey));
      } else {
        updates.push(SecureStore.deleteItemAsync(KEYS.openaiApiKey));
      }
    }
    if (input.openaiBaseUrl !== undefined) {
      updates.push(SecureStore.setItemAsync(KEYS.openaiBaseUrl, input.openaiBaseUrl));
    }
    if (input.templateID !== undefined) {
      updates.push(SecureStore.setItemAsync(KEYS.templateID, input.templateID));
    }
    await Promise.all(updates);
    setCredentials((prev) => ({ ...prev, ...input }));
  }, []);

  const hasRequired = loaded && !!credentials.e2bApiKey && !!credentials.openaiApiKey;

  return { credentials, hasRequired, loaded, saveCredentials } as const;
}
