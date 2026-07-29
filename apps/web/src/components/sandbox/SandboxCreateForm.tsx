import type { SandboxCreateInput, SandboxInfo } from "@t3tools/shared/sandbox";
import { LoaderIcon } from "lucide-react";
import { useState } from "react";

import { useSandboxCredentials } from "../../hooks/useSandboxCredentials";
import { useSandboxApi } from "../../hooks/useSandboxApi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface Props {
  readonly onSuccess: () => void;
  readonly onCancel: () => void;
}

export function SandboxCreateForm({ onSuccess, onCancel }: Props) {
  const creds = useSandboxCredentials();
  const { api, connect } = useSandboxApi(creds.credentials);
  const [timeoutHours, setTimeoutHours] = useState("3");
  const [githubRepo, setGithubRepo] = useState("");
  const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!creds.hasRequired) return;
    setStatus("creating");
    setError(null);
    try {
      const hours = Math.max(1, parseInt(timeoutHours, 10) || 3);
      const input: SandboxCreateInput = {
        templateID: creds.credentials.templateID,
        timeout: hours * 3600,
      };
      if (githubRepo.trim()) {
        input.resources = [
          {
            type: "git_repository",
            url: `https://github.com/${githubRepo.trim()}`,
            mount_path: "/home/user/project",
          },
        ];
      }
      const sandbox = await api.createSandbox(input);
      const connected = await api.connectSandbox(sandbox.sandboxID, 3600);
      await connect(connected as SandboxInfo);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建失败");
      setStatus("error");
    }
  };

  if (!creds.isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!creds.hasRequired) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">请先在设置中配置沙箱凭证</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold">创建沙箱</h2>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">超时时间（小时）</label>
          <Input
            type="number"
            min={1}
            max={24}
            value={timeoutHours}
            onChange={(e) => setTimeoutHours(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">GitHub 仓库（可选）</label>
          <Input
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
            placeholder="owner/repo"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            指定后会自动克隆到沙箱中的 /home/user/project
          </p>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {status === "creating" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin" />
          正在创建沙箱并启动 T3 Server...
        </div>
      )}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onCancel} disabled={status === "creating"}>
          取消
        </Button>
        <Button onClick={handleCreate} disabled={status === "creating" || !creds.hasRequired}>
          创建沙箱
        </Button>
      </div>
    </div>
  );
}
