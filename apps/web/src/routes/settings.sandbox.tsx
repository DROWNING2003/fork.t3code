import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { SandboxCredentials } from "@t3tools/contracts/sandbox";
import type { HttpInjection } from "@t3tools/shared/sandbox";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  LoaderIcon,
  PlusIcon,
  ServerCogIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SettingsPageContainer } from "../components/settings/settingsLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useSandboxCredentials } from "../hooks/useSandboxCredentials";
import { getAdditionalInjections, setAdditionalInjections } from "../lib/sandboxCredentialStore";
import { cn } from "../lib/utils";

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

type SaveState = "idle" | "saving" | "error";

function SandboxCredentialsSettings() {
  const navigate = useNavigate();
  const { credentials, isLoaded, save } = useSandboxCredentials();
  const initialized = useRef(false);

  const [e2bKey, setE2bKey] = useState(credentials.e2bApiKey);
  const [e2bApiUrl, setE2bApiUrl] = useState(credentials.e2bApiUrl);
  const [templateID, setTemplateID] = useState(credentials.templateID);
  const [entries, setEntries] = useState<InjectionEntry[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");

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
    setSaveState("idle");
    setEntries((prev) => [
      ...prev,
      { id: nextId++, baseUrl: "", apiKey: "", header: "Authorization", headerPrefix: "Bearer " },
    ]);
  };

  const removeEntry = (id: number) => {
    setSaveState("idle");
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: number, field: keyof InjectionEntry, value: string) => {
    setSaveState("idle");
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
  };

  const handleSave = async () => {
    if (!e2bKey.trim()) {
      setSaveState("error");
      return;
    }
    setSaveState("saving");
    try {
      const creds: SandboxCredentials = {
        e2bApiKey: e2bKey.trim(),
        e2bApiUrl: e2bApiUrl.trim(),
        openaiApiKey: credentials.openaiApiKey,
        openaiBaseUrl: credentials.openaiBaseUrl,
        templateID: templateID.trim(),
      };
      await save(creds);
      saveInjections(entries);
      void navigate({ to: "/settings" });
    } catch {
      setSaveState("error");
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
    <SettingsPageContainer className="max-w-4xl gap-8 sm:gap-10">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">
            沙箱凭证
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            配置沙箱服务连接和 Provider 注入。
          </p>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 pt-1 text-xs font-medium",
            e2bKey.trim()
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-amber-700 dark:text-amber-400",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              e2bKey.trim() ? "bg-emerald-500" : "bg-amber-500",
            )}
            aria-hidden="true"
          />
          {e2bKey.trim() ? "凭证已配置" : "需要配置 API Key"}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card/30 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <ServerCogIcon className="size-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold">运行环境</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">沙箱服务与模板</p>
            </div>
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">Sandbox</span>
        </div>
        <div className="grid gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-5">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium" htmlFor="e2b-api-key">
              Sandbox API Key
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </label>
            <Input
              id="e2b-api-key"
              type="password"
              value={e2bKey}
              onChange={(e) => {
                setE2bKey(e.target.value);
                setSaveState("idle");
              }}
              placeholder="sk-..."
              className="font-mono text-[13px] sm:max-w-xl"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">用于创建、暂停和连接沙箱。</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="e2b-api-url">
              Sandbox API URL
            </label>
            <Input
              id="e2b-api-url"
              type="url"
              value={e2bApiUrl}
              onChange={(e) => {
                setE2bApiUrl(e.target.value);
                setSaveState("idle");
              }}
              placeholder="https://cn-yangzhou-1-sandbox.qiniuapi.com"
              className="font-mono text-[13px]"
              spellCheck={false}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="template-id">
              Template ID
            </label>
            <Input
              id="template-id"
              value={templateID}
              onChange={(e) => {
                setTemplateID(e.target.value);
                setSaveState("idle");
              }}
              placeholder="usrrhp4zsns5yyithi8a"
              className="font-mono text-[13px]"
              spellCheck={false}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card/30 shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2">
            <KeyRoundIcon className="size-4 text-muted-foreground" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">Provider 注入</h2>
                <span className="text-xs text-muted-foreground">{entries.length} 个</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">为沙箱内的工具提供 API 访问</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={addEntry}
            className="text-primary hover:bg-primary/8 hover:text-primary [transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          >
            <PlusIcon className="size-3.5" />
            添加 Provider
          </Button>
        </div>
        {entries.length === 0 ? (
          <div className="mx-4 my-4 border-l-2 border-border/70 px-4 py-3 sm:mx-5">
            <p className="text-sm font-medium">暂未添加 Provider</p>
            <p className="mt-1 text-xs text-muted-foreground">按需添加额外的 HTTP Provider。</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {entries.map((entry, index) => {
              const preset = BASE_URL_PRESETS.find((p) => p.value === entry.baseUrl);
              return (
                <div key={entry.id} className="px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">Provider {index + 1}</p>
                        <span className="text-xs text-muted-foreground">
                          {preset?.label ?? "自定义"}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        请求头：{entry.header}
                        {entry.headerPrefix ? ` · ${entry.headerPrefix}` : ""}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeEntry(entry.id)}
                      aria-label={`删除 Provider ${index + 1}`}
                      title="删除 Provider"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,0.7fr)]">
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium text-muted-foreground"
                        htmlFor={`provider-url-${entry.id}`}
                      >
                        Base URL
                      </label>
                      <Input
                        id={`provider-url-${entry.id}`}
                        size="sm"
                        value={entry.baseUrl}
                        onChange={(e) => updateEntry(entry.id, "baseUrl", e.target.value)}
                        placeholder="https://api.example.com"
                        className="font-mono text-[12px]"
                        spellCheck={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-xs font-medium text-muted-foreground"
                        htmlFor={`provider-key-${entry.id}`}
                      >
                        API Key
                      </label>
                      <Input
                        id={`provider-key-${entry.id}`}
                        size="sm"
                        type="password"
                        value={entry.apiKey}
                        onChange={(e) => updateEntry(entry.id, "apiKey", e.target.value)}
                        placeholder={`输入 ${entry.header}`}
                        className="font-mono text-[12px]"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-xs text-muted-foreground">预设：</span>
                    {BASE_URL_PRESETS.map((p) => (
                      <Button
                        key={p.value}
                        size="xs"
                        variant={entry.baseUrl === p.value ? "secondary" : "ghost"}
                        onClick={() => updateEntry(entry.id, "baseUrl", p.value)}
                        className={cn(
                          "[transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
                          entry.baseUrl === p.value
                            ? "bg-muted/80 text-foreground hover:bg-muted"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          {saveState === "error" ? (
            <>
              <AlertCircleIcon className="size-3.5 shrink-0 text-destructive" />
              <span className="text-destructive">保存失败，请检查输入后重试。</span>
            </>
          ) : (
            <span>凭证保存在当前设备。</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => void navigate({ to: "/settings" })}>
            取消
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveState === "saving" || !e2bKey.trim()}
            className="shadow-none [transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
          >
            {saveState === "saving" ? (
              <LoaderIcon className="size-3.5 animate-spin" />
            ) : (
              <CheckCircle2Icon className="size-3.5" />
            )}
            {saveState === "saving" ? "保存中..." : "保存配置"}
          </Button>
        </div>
      </div>
    </SettingsPageContainer>
  );
}
