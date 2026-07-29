import { NativeHeaderToolbar, NativeStackScreenOptions } from "../../native/StackHeader";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AndroidScreenHeader } from "../../components/AndroidScreenHeader";
import { AppText as Text } from "../../components/AppText";
import { EmptyState } from "../../components/EmptyState";
import { ConnectionSheetButton } from "../connection/ConnectionSheetButton";
import { useSandboxApi } from "./useSandboxApi";
import { useSandboxCredentials } from "./useSandboxCredentials";
import { type SandboxInfo, sandboxUrl } from "./sandboxTypes";
import { useRemoteConnections } from "../../state/use-remote-environment-registry";
import * as Cause from "effect/Cause";
import { AsyncResult } from "effect/unstable/reactivity";
import { cn } from "../../lib/cn";
import { useThemeColor } from "../../lib/useThemeColor";
import { SymbolView } from "expo-symbols";

function formatTTL(endAt: string): string {
  const end = new Date(endAt).getTime();
  const now = Date.now();
  const remaining = Math.max(0, end - now);
  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function ttlColor(endAt: string): string {
  const end = new Date(endAt).getTime();
  const remaining = end - Date.now();
  if (remaining < 30 * 60000) return "text-amber-500";
  return "text-foreground-muted";
}

export function SandboxRouteScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { credentials, hasRequired } = useSandboxCredentials();
  const {
    listSandboxes,
    deleteSandbox,
    refreshSandbox,
    connectSandbox,
    startSandboxT3Server,
    getPairingUrl,
  } = useSandboxApi({
    apiKey: credentials.e2bApiKey ?? "",
    apiUrl: credentials.e2bApiUrl,
  });
  const { onConnectPress } = useRemoteConnections();
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const iconColor = useThemeColor("--color-icon");

  const loadSandboxes = useCallback(async () => {
    if (!hasRequired) return;
    try {
      const list = await listSandboxes();
      setSandboxes(list.filter((s) => s.state === "running"));
    } catch {}
  }, [hasRequired, listSandboxes]);

  useFocusEffect(
    useCallback(() => {
      void loadSandboxes();
    }, [loadSandboxes]),
  );

  const handleDelete = useCallback(
    (sandboxID: string) => {
      Alert.alert("Delete Sandbox", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteSandbox(sandboxID);
              await loadSandboxes();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : String(err));
            }
          },
        },
      ]);
    },
    [deleteSandbox, loadSandboxes],
  );

  const handleRefresh = useCallback(
    async (sandboxID: string) => {
      try {
        await refreshSandbox(sandboxID, 3600);
        await loadSandboxes();
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : String(err));
      }
    },
    [refreshSandbox, loadSandboxes],
  );

  const handleConnect = useCallback(
    async (sandboxID: string) => {
      setConnecting(sandboxID);
      try {
        const connectedSandbox = await connectSandbox(sandboxID, 3600);
        await startSandboxT3Server(
          connectedSandbox,
          credentials.sandboxDomain,
          credentials.openaiBaseUrl,
        );
        const pairingUrl = await getPairingUrl(
          connectedSandbox.sandboxID,
          connectedSandbox.domain,
          credentials.sandboxDomain,
          connectedSandbox,
        );
        const result = await onConnectPress(pairingUrl);
        if (AsyncResult.isSuccess(result)) {
          navigation.goBack();
        } else {
          const connectionError = Cause.squash(result.cause);
          Alert.alert(
            "Connection Failed",
            connectionError instanceof Error
              ? connectionError.message
              : "Could not connect to this sandbox.",
          );
        }
      } catch (err) {
        Alert.alert("Error", err instanceof Error ? err.message : String(err));
      } finally {
        setConnecting(null);
      }
    },
    [
      connectSandbox,
      credentials.sandboxDomain,
      credentials.openaiBaseUrl,
      getPairingUrl,
      navigation,
      onConnectPress,
      startSandboxT3Server,
    ],
  );

  if (!hasRequired) {
    return (
      <View collapsable={false} className="flex-1 bg-sheet">
        <NativeStackScreenOptions options={{ title: "Sandboxes" }} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
        >
          <EmptyState
            variant="card"
            title="Credentials Required"
            detail="Set your E2B API key and OpenAI key in Settings to manage sandboxes."
            actionLabel="Open Settings"
            onAction={() => navigation.navigate("SettingsSheet")}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View collapsable={false} className="flex-1 bg-sheet">
      <NativeStackScreenOptions
        options={{
          ...(Platform.OS === "android" ? { headerShown: false } : null),
          title: "Sandboxes",
        }}
      />
      {Platform.OS === "android" ? (
        <AndroidScreenHeader
          title="Sandboxes"
          onBack={() => navigation.goBack()}
          actions={[
            {
              accessibilityLabel: "Refresh",
              icon: "arrow.clockwise",
              onPress: () => void loadSandboxes(),
            },
          ]}
        />
      ) : (
        <NativeHeaderToolbar placement="right">
          <NativeHeaderToolbar.Button
            icon="arrow.clockwise"
            onPress={() => void loadSandboxes()}
            separateBackground
            tintColor={iconColor}
          />
        </NativeHeaderToolbar>
      )}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentInset={{ bottom: Math.max(insets.bottom, 18) + 80 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
      >
        <View collapsable={false} className="gap-5">
          {sandboxes.length === 0 ? (
            <EmptyState
              variant="card"
              title="No Sandboxes"
              detail="Create a sandbox to run T3 Code in the cloud."
            />
          ) : (
            <View collapsable={false} className="overflow-hidden rounded-[24px] bg-card">
              {sandboxes.map((sb, i) => (
                <View
                  key={sb.sandboxID}
                  collapsable={false}
                  className={cn("p-4 gap-2", i !== 0 && "border-t border-border")}
                >
                  <View collapsable={false} className="flex-row items-center justify-between">
                    <View collapsable={false} className="flex-row items-center gap-2">
                      <SymbolView name="cloud" size={16} tintColor={iconColor} type="monochrome" />
                      <Text className="text-base font-t3-medium text-foreground">
                        {sb.alias || sb.sandboxID.slice(0, 12)}
                      </Text>
                    </View>
                    <Text className={cn("text-xs", ttlColor(sb.endAt))}>{formatTTL(sb.endAt)}</Text>
                  </View>
                  <Text className="text-xs text-foreground-muted">
                    {sandboxUrl(sb.sandboxID, sb.domain, credentials.sandboxDomain) ??
                      "Public domain unavailable"}
                  </Text>
                  <View collapsable={false} className="flex-row gap-2 mt-1">
                    <ConnectionSheetButton
                      compact
                      icon="link"
                      label={connecting === sb.sandboxID ? "Connecting..." : "Connect"}
                      disabled={connecting !== null}
                      tone="primary"
                      onPress={() => void handleConnect(sb.sandboxID)}
                    />
                    <ConnectionSheetButton
                      compact
                      icon="clock"
                      label="Refresh"
                      tone="secondary"
                      onPress={() => void handleRefresh(sb.sandboxID)}
                    />
                    <ConnectionSheetButton
                      compact
                      icon="trash"
                      label="Delete"
                      tone="danger"
                      onPress={() => handleDelete(sb.sandboxID)}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <View
        collapsable={false}
        className="absolute bottom-4 right-5"
        style={{ paddingBottom: insets.bottom }}
      >
        <ConnectionSheetButton
          icon="plus"
          label="Create Sandbox"
          tone="primary"
          onPress={() => navigation.navigate("SandboxNew")}
        />
      </View>
    </View>
  );
}
