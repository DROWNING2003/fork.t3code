import type { SandboxCredentials } from "@t3tools/contracts/sandbox";
import { useEffect, useState } from "react";
import type { UseSandboxCredentialsResult } from "../../hooks/useSandboxCredentials";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface Props {
  readonly credentials: UseSandboxCredentialsResult;
  readonly onComplete: () => void;
  readonly onCancel: () => void;
}

export function SandboxCredentialsWizard({ credentials, onComplete, onCancel }: Props) {
  const { credentials: creds, save } = credentials;
  const [step, setStep] = useState(0);
  const [local, setLocal] = useState<SandboxCredentials>({ ...creds });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLocal({ ...creds });
  }, [creds]);

  const update = (field: keyof SandboxCredentials, value: string) =>
    setLocal((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(local);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-foreground" : "bg-muted"}`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">E2B API 配置</h2>
          <p className="text-sm text-muted-foreground">
            输入你的 E2B 兼容沙箱 API Key 和 API 地址。
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">E2B API Key</label>
              <Input
                type="password"
                value={local.e2bApiKey}
                onChange={(e) => update("e2bApiKey", e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">E2B API URL</label>
              <Input
                type="url"
                value={local.e2bApiUrl}
                onChange={(e) => update("e2bApiUrl", e.target.value)}
                placeholder="https://cn-yangzhou-1-sandbox.qiniuapi.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Sandbox Public Domain</label>
              <Input
                type="url"
                value={local.sandboxDomain}
                onChange={(e) => update("sandboxDomain", e.target.value)}
                placeholder="可选，沙箱公共域名"
              />
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">OpenAI 配置</h2>
          <p className="text-sm text-muted-foreground">
            输入你的 OpenAI 兼容 API Key 和地址，用于沙箱中的 Codex 开发。
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">OpenAI API Key</label>
              <Input
                type="password"
                value={local.openaiApiKey}
                onChange={(e) => update("openaiApiKey", e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">OpenAI Base URL</label>
              <Input
                type="url"
                value={local.openaiBaseUrl}
                onChange={(e) => update("openaiBaseUrl", e.target.value)}
                placeholder="https://api.fenno.ai"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">确认并保存</h2>
          <p className="text-sm text-muted-foreground">确认以下配置，保存后即可开始使用沙箱。</p>
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">E2B API Key</span>
              <span className="text-sm font-medium">{local.e2bApiKey ? "••••••••" : "未设置"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">E2B API URL</span>
              <span className="text-sm font-medium">{local.e2bApiUrl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">OpenAI API Key</span>
              <span className="text-sm font-medium">
                {local.openaiApiKey ? "••••••••" : "未设置"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">OpenAI Base URL</span>
              <span className="text-sm font-medium">{local.openaiBaseUrl}</span>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Template ID</label>
            <Input
              value={local.templateID}
              onChange={(e) => update("templateID", e.target.value)}
              placeholder="沙箱模板 ID"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={step === 0 ? onCancel : () => setStep((s) => s - 1)}>
          {step === 0 ? "取消" : "上一步"}
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={step === 0 && !local.e2bApiKey}>
            下一步
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving || !local.e2bApiKey || !local.openaiApiKey}>
            {saving ? "保存中..." : "保存并完成"}
          </Button>
        )}
      </div>
    </div>
  );
}
