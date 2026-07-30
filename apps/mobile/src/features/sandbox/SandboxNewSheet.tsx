import { NativeStackScreenOptions } from "../../native/StackHeader";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AndroidScreenHeader } from "../../components/AndroidScreenHeader";
import { AppText as Text, AppTextInput as TextInput } from "../../components/AppText";
import { ErrorBanner } from "../../components/ErrorBanner";
import { ConnectionSheetButton } from "../connection/ConnectionSheetButton";
import { useSandboxApi } from "./useSandboxApi";
import { useSandboxCredentials } from "./useSandboxCredentials";
import { getAdditionalInjections } from "./useSandboxCredentials";
import { useRemoteConnections } from "../../state/use-remote-environment-registry";
import { detectCodexProviders, DEFAULT_SANDBOX_SKILLS } from "@t3tools/shared/sandbox";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/unstable/reactivity";
import {
  DEFAULT_TEMPLATE_ID,
  DEFAULT_OPENAI_BASE_URL,
  DEFAULT_TIMEOUT_HOURS,
  type SandboxCreateInput,
} from "./sandboxTypes";

export function SandboxNewSheet() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { credentials } = useSandboxCredentials();
  const api = useSandboxApi({
    apiKey: credentials.e2bApiKey ?? "",
    apiUrl: credentials.e2bApiUrl,
  });
  const { onConnectPress } = useRemoteConnections();

  const [timeoutHours, setTimeoutHours] = useState(String(DEFAULT_TIMEOUT_HOURS));
  const [githubRepo, setGithubRepo] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [mountPath, setMountPath] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    setError(null);
    const hours = parseInt(timeoutHours, 10) || DEFAULT_TIMEOUT_HOURS;
    const templateID = credentials.templateID || DEFAULT_TEMPLATE_ID;

    try {
      const openAiBaseUrl = credentials.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL;
      const injections: SandboxCreateInput["injections"] = credentials.openaiApiKey
        ? [
            {
              type: "openai" as const,
              api_key: credentials.openaiApiKey,
              base_url: openAiBaseUrl,
            },
          ]
        : undefined;
      const additional = await getAdditionalInjections();
      const merged: SandboxCreateInput["injections"] =
        additional.length > 0
          ? ([...(injections ?? []), ...additional] as SandboxCreateInput["injections"])
          : injections;
      const envVars = credentials.openaiApiKey
        ? {
            // The real key remains in the platform injection rule. Codex only
            // needs a non-empty value to enable its OpenAI authentication path.
            OPENAI_API_KEY: "sandbox-injection-placeholder",
            OPENAI_BASE_URL: openAiBaseUrl,
          }
        : undefined;

      const resources = githubRepo.trim()
        ? [
            {
              type: "github_repository" as const,
              url: `https://github.com/${githubRepo.trim()}`,
              mount_path: mountPath.trim() || "/home/user/repo",
              authorization_token: githubToken.trim() || "",
            },
          ]
        : undefined;

      const sandbox = await api.createSandbox({
        templateID,
        timeout: hours * 3600,
        autoPause: true,
        network: { allowPublicTraffic: true },
        envVars,
        ...(merged ? { injections: merged } : {}),
        ...(name.trim() ? { metadata: { name: name.trim() } } : {}),
        resources,
      });

      // Wait for T3 Server to boot and get pairing URL
      setError("Waiting for T3 Server to start...");
      const connectedSandbox = await api.connectSandbox(sandbox.sandboxID, hours * 3600);
      const providers = detectCodexProviders(
        (merged ?? []).flatMap((i) => {
          const url = (i as { base_url?: string }).base_url;
          return url ? [{ base_url: url }] : [];
        }),
      );
      await api.startSandboxT3Server(
        connectedSandbox,
        credentials.sandboxDomain,
        providers,
        DEFAULT_SANDBOX_SKILLS,
      );
      const pairingUrl = await api.getPairingUrl(
        connectedSandbox.sandboxID,
        connectedSandbox.domain ?? sandbox.domain,
        credentials.sandboxDomain,
        connectedSandbox,
      );
      const result = await onConnectPress(pairingUrl);
      if (AsyncResult.isSuccess(result)) {
        navigation.goBack();
      } else {
        const connectionError = Cause.squash(result.cause);
        setError(
          connectionError instanceof Error
            ? connectionError.message
            : "Could not connect to sandbox. Try again.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }, [timeoutHours, githubRepo, credentials, api, navigation]);

  return (
    <View collapsable={false} className="flex-1 bg-sheet">
      <NativeStackScreenOptions
        options={{
          ...(Platform.OS === "android" ? { headerShown: false } : null),
          title: "Create Sandbox",
        }}
      />
      {Platform.OS === "android" ? (
        <AndroidScreenHeader title="Create Sandbox" onBack={() => navigation.goBack()} />
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentInset={{ bottom: Math.max(insets.bottom, 18) + 18 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
      >
        <View collapsable={false} className="gap-5">
          <View collapsable={false} className="gap-4 rounded-[24px] bg-card p-4">
            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                Name
              </Text>
              <TextInput
                placeholder="可选，方便识别沙箱"
                value={name}
                onChangeText={setName}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                Timeout (hours)
              </Text>
              <TextInput
                keyboardType="numeric"
                placeholder={String(DEFAULT_TIMEOUT_HOURS)}
                value={timeoutHours}
                onChangeText={setTimeoutHours}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                GitHub repository (optional)
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="owner/repo"
                value={githubRepo}
                onChangeText={setGithubRepo}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            {githubRepo.trim() ? (
              <>
                <View collapsable={false} className="gap-1.5">
                  <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                    Mount Path
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="/home/user/repo"
                    value={mountPath}
                    onChangeText={setMountPath}
                    className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
                  />
                </View>
                <View collapsable={false} className="gap-1.5">
                  <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                    GitHub Token
                  </Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    placeholder="ghp_..."
                    value={githubToken}
                    onChangeText={setGithubToken}
                    className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
                  />
                </View>
              </>
            ) : null}

            {error ? <ErrorBanner message={error} /> : null}

            <ConnectionSheetButton
              icon="plus"
              label={creating ? "Creating..." : "Create Sandbox"}
              tone="primary"
              disabled={creating}
              onPress={() => void handleCreate()}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
