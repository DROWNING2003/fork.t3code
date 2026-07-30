import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { SandboxCredentials } from "@t3tools/contracts/sandbox";
import type { HttpInjection } from "@t3tools/shared/sandbox";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SettingsPageContainer } from "../components/settings/settingsLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useSandboxCredentials } from "../hooks/useSandboxCredentials";
import { getAdditionalInjections, setAdditionalInjections } from "../lib/sandboxCredentialStore";

export const Route = createFileRoute("/settings/sandbox")({
  component: SandboxCredentialsSettings,
});

const BASE_URL_PRESETS = [
  {
    label: "OpenAI",
    value: "https://api.openai.com",
    header: "Authorization",
    headerPrefix: "Bearer ",
  },
  { label: "Anthropic", value: "https://api.anthropic.com", header: "x-api-key", headerPrefix: "" },
  {
    label: "Gemini",
    value: "https://generativelanguage.googleapis.com",
    header: "x-goog-api-key",
    headerPrefix: "",
  },
  {
    label: "Qiniu",
    value: "https://api.qnaigc.com",
    header: "Authorization",
    headerPrefix: "Bearer ",
  },
];

interface InjectionEntry {
  id: number;
  baseUrl: string;
  apiKey: string;
  header: string;
  headerPrefix: string;
}

function loadInjections(): InjectionEntry[] {
  const injections = getAdditionalInjections();
  return injections
    .filter((inj): inj is HttpInjection => inj.type === "http")
    .map((inj, i) => ({
      id: i,
      baseUrl: inj.base_url,
      apiKey: inj.headers ? (Object.values(inj.headers)[0] ?? "") : "",
      header: inj.headers ? (Object.keys(inj.headers)[0] ?? "Authorization") : "Authorization",
      headerPrefix: "",
    }));
}

function saveInjections(entries: InjectionEntry[]): void {
  const injections: HttpInjection[] = entries
    .filter((e) => e.baseUrl.trim() && e.apiKey.trim())
    .map((e) => ({
      type: "http",
      base_url: e.baseUrl.trim(),
      headers: { [e.header || "Authorization"]: `${e.headerPrefix}${e.apiKey.trim()}` },
    }));
  setAdditionalInjections(injections);
}

let nextId = 0;

function SandboxCredentialsSettings() {
  const navigate = useNavigate();
  const { credentials, isLoaded, save } = useSandboxCredentials();
  const initialized = useRef(false);

  const [e2bKey, setE2bKey] = useState(credentials.e2bApiKey);
  const [e2bApiUrl, setE2bApiUrl] = useState(credentials.e2bApiUrl);
  const [templateID, setTemplateID] = useState(credentials.templateID);
  const [entries, setEntries] = useState<InjectionEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || initialized.current) return;
    initialized.current = true;
    setE2bKey(credentials.e2bApiKey);
    setE2bApiUrl(credentials.e2bApiUrl);
    setTemplateID(credentials.templateID);
    const loaded = loadInjections();
    setEntries(loaded);
    nextId = loaded.length;
  }, [credentials, isLoaded]);

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: nextId++, baseUrl: "", apiKey: "", header: "Authorization", headerPrefix: "Bearer " },
    ]);
  };

  const removeEntry = (id: number) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const updateEntry = (id: number, field: keyof InjectionEntry, value: string) =>
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, [field]: value };
        if (field === "baseUrl") {
          const preset = BASE_URL_PRESETS.find((p) => p.value === value);
          if (preset) {
            updated.header = preset.header;
            updated.headerPrefix = preset.headerPrefix;
          }
        }
        return updated;
      }),
    );

  const handleSave = async () => {
    setSaving(true);
    try {
      const creds: SandboxCredentials = {
        e2bApiKey: e2bKey.trim(),
        e2bApiUrl: e2bApiUrl.trim(),
        sandboxDomain: credentials.sandboxDomain,
        openaiApiKey: credentials.openaiApiKey,
        openaiBaseUrl: credentials.openaiBaseUrl,
        templateID: templateID.trim(),
      };
      await save(creds);
      saveInjections(entries);
      void navigate({ to: "/settings" });
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <SettingsPageContainer>
        <p className="text-sm text-muted-foreground">加载中...</p>
      </SettingsPageContainer>
    );
  }

  return (
    <SettingsPageContainer>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">沙箱凭证</h1>
          <p className="text-sm text-muted-foreground">
            凭证变更后，新创建的沙箱会自动注入更新后的配置。
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">E2B API Key</label>
            <Input
              type="password"
              value={e2bKey}
              onChange={(e) => setE2bKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">E2B API URL</label>
            <Input
              type="url"
              value={e2bApiUrl}
              onChange={(e) => setE2bApiUrl(e.target.value)}
              placeholder="https://cn-yangzhou-1-sandbox.qiniuapi.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Template ID</label>
            <Input
              value={templateID}
              onChange={(e) => setTemplateID(e.target.value)}
              placeholder="usrrhp4zsns5yyithi8a"
            />
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Provider</label>
              <Button size="xs" variant="ghost" onClick={addEntry}>
                <PlusIcon className="size-3" />
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 text-xs flex-1"
                      value={entry.baseUrl}
                      onChange={(e) => updateEntry(entry.id, "baseUrl", e.target.value)}
                      placeholder="https://api.example.com"
                    />
                    <Button size="xs" variant="ghost" onClick={() => removeEntry(entry.id)}>
                      <Trash2Icon className="size-3 text-destructive" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {BASE_URL_PRESETS.map((p) => (
                      <Button
                        key={p.value}
                        size="xs"
                        variant={entry.baseUrl === p.value ? "default" : "outline"}
                        onClick={() => updateEntry(entry.id, "baseUrl", p.value)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                  <Input
                    className="h-8 text-xs"
                    type="password"
                    value={entry.apiKey}
                    onChange={(e) => updateEntry(entry.id, "apiKey", e.target.value)}
                    placeholder={`API Key (${entry.header})`}
                  />
                </div>
              ))}
              {entries.length === 0 && (
                <p className="text-xs text-muted-foreground">暂无 Provider。点击 + 添加。</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => void navigate({ to: "/settings" })}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !e2bKey.trim()}>
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </SettingsPageContainer>
  );
}
