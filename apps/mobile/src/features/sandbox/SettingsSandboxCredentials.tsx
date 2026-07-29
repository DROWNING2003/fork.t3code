import { NativeStackScreenOptions } from "../../native/StackHeader";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AndroidScreenHeader } from "../../components/AndroidScreenHeader";
import { AppText as Text, AppTextInput as TextInput } from "../../components/AppText";
import { ConnectionSheetButton } from "../connection/ConnectionSheetButton";
import { useSandboxCredentials } from "./useSandboxCredentials";
import { DEFAULT_OPENAI_BASE_URL, DEFAULT_TEMPLATE_ID } from "./sandboxTypes";
import { DEFAULT_SANDBOX_API_URL } from "./useSandboxApi";

export function SettingsSandboxCredentials() {
  const { credentials, loaded, saveCredentials } = useSandboxCredentials();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const initialized = useRef(false);

  const [e2bKey, setE2bKey] = useState(credentials.e2bApiKey ?? "");
  const [e2bApiUrl, setE2bApiUrl] = useState(credentials.e2bApiUrl ?? "");
  const [sandboxDomain, setSandboxDomain] = useState(credentials.sandboxDomain ?? "");
  const [openaiKey, setOpenaiKey] = useState(credentials.openaiApiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(credentials.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL);
  const [templateID, setTemplateID] = useState(credentials.templateID || DEFAULT_TEMPLATE_ID);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loaded || initialized.current) return;
    initialized.current = true;
    setE2bKey(credentials.e2bApiKey ?? "");
    setE2bApiUrl(credentials.e2bApiUrl ?? "");
    setSandboxDomain(credentials.sandboxDomain ?? "");
    setOpenaiKey(credentials.openaiApiKey ?? "");
    setBaseUrl(credentials.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL);
    setTemplateID(credentials.templateID || DEFAULT_TEMPLATE_ID);
  }, [credentials, loaded]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveCredentials({
        e2bApiKey: e2bKey.trim(),
        e2bApiUrl: e2bApiUrl.trim(),
        sandboxDomain: sandboxDomain.trim(),
        openaiApiKey: openaiKey.trim(),
        openaiBaseUrl: baseUrl.trim() || DEFAULT_OPENAI_BASE_URL,
        templateID: templateID.trim() || DEFAULT_TEMPLATE_ID,
      });
      if (navigation.canGoBack()) navigation.goBack();
    } catch (error) {
      Alert.alert(
        "Could Not Save Credentials",
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setSaving(false);
    }
  }, [
    e2bKey,
    e2bApiUrl,
    sandboxDomain,
    openaiKey,
    baseUrl,
    templateID,
    saveCredentials,
    navigation,
  ]);

  return (
    <View collapsable={false} className="flex-1 bg-sheet">
      <NativeStackScreenOptions
        options={{
          ...(Platform.OS === "android" ? { headerShown: false } : null),
          title: "Sandbox Credentials",
        }}
      />
      {Platform.OS === "android" ? (
        <AndroidScreenHeader title="Sandbox Credentials" onBack={() => navigation.goBack()} />
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
                E2B API Key
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder="sk-..."
                value={e2bKey}
                onChangeText={setE2bKey}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                E2B API URL
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder={DEFAULT_SANDBOX_API_URL}
                value={e2bApiUrl}
                onChangeText={setE2bApiUrl}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                Sandbox Public Domain (E2B_DOMAIN)
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder="sandbox.example.com"
                value={sandboxDomain}
                onChangeText={setSandboxDomain}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
              <Text className="text-xs text-foreground-muted">
                Only needed when your test server does not return a sandbox domain.
              </Text>
            </View>

            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                OpenAI API Key
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder="sk-..."
                value={openaiKey}
                onChangeText={setOpenaiKey}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                Base URL
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder={DEFAULT_OPENAI_BASE_URL}
                value={baseUrl}
                onChangeText={setBaseUrl}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            <View collapsable={false} className="gap-1.5">
              <Text className="text-2xs font-t3-bold tracking-[0.8px] uppercase text-foreground-muted">
                Template ID
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={DEFAULT_TEMPLATE_ID}
                value={templateID}
                onChangeText={setTemplateID}
                className="rounded-[14px] border border-input-border bg-input px-4 py-3.5 text-base text-foreground"
              />
            </View>

            <ConnectionSheetButton
              icon="checkmark"
              label={saving ? "Saving..." : "Save"}
              tone="primary"
              disabled={!loaded || saving}
              onPress={() => {
                void handleSave();
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
