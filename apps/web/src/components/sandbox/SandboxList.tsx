import type { SandboxInfo } from "@t3tools/shared/sandbox";
import { useAtomValue } from "@effect/atom-react";
import { CloudIcon, LoaderIcon, PlusIcon, Settings2Icon } from "lucide-react";
import * as Option from "effect/Option";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BOUNDLY_SANDBOX_METADATA } from "@t3tools/shared/sandbox";

import { environmentCatalog } from "../../connection/catalog";
import { useSandboxCredentials } from "../../hooks/useSandboxCredentials";
import { useSandboxApi } from "../../hooks/useSandboxApi";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "../ui/empty";
import { SandboxCard } from "./SandboxCard";
import { Toggle, ToggleGroup } from "../ui/toggle-group";

const SANDBOX_ID_REGEX = /^(?:\d+)-([a-z0-9]+)\./i;

function sandboxIdFromUrl(url: string): string | null {
  try {
    const match = SANDBOX_ID_REGEX.exec(new URL(url).hostname);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function getHttpBaseUrl(entry: { readonly profile: Option.Option<unknown> }): string | null {
  if (!Option.isSome(entry.profile)) return null;
  const httpBaseUrl = (entry.profile.value as { httpBaseUrl?: string }).httpBaseUrl;
  return httpBaseUrl ?? null;
}

interface Props {
  readonly onNavigateToSettings: () => void;
  readonly onNavigateToCreate: () => void;
}

export function SandboxList({ onNavigateToSettings, onNavigateToCreate }: Props) {
  const navigate = useNavigate();
  const creds = useSandboxCredentials();
  const { api, connect } = useSandboxApi(creds.credentials);
  const [sandboxes, setSandboxes] = useState<readonly SandboxInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [scope, setScope] = useState<"boundly" | "all">("boundly");
  const catalog = useAtomValue(environmentCatalog.catalogValueAtom);
  const removeEnv = useAtomCommand(environmentCatalog.remove, "sandbox environment remove");

  const load = useCallback(async () => {
    if (!creds.hasRequired) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await api.list(
        scope === "boundly" ? { metadata: BOUNDLY_SANDBOX_METADATA } : undefined,
      );
      if (scope === "all") {
        const apiIds = new Set(list.map((s) => s.sandboxID));
        for (const [envId, entry] of catalog.entries) {
          const httpBaseUrl = getHttpBaseUrl(entry);
          if (!httpBaseUrl) continue;
          const sandboxID = sandboxIdFromUrl(httpBaseUrl);
          if (sandboxID && !apiIds.has(sandboxID)) {
            await removeEnv(envId);
          }
        }
      }
      setSandboxes(list);
    } catch {
      setSandboxes([]);
    } finally {
      setLoading(false);
    }
  }, [api, creds.hasRequired, removeEnv, catalog.entries, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConnect = useCallback(
    async (sandbox: SandboxInfo) => {
      setConnecting(sandbox.sandboxID);
      try {
        const connected = await api.connect(sandbox.sandboxID, 3600);
        await connect(connected as SandboxInfo);
        void navigate({ to: "/" });
      } catch {
        setConnecting(null);
      }
    },
    [api, connect],
  );

  const handleRefresh = useCallback(
    async (sandboxID: string) => {
      try {
        await api.refresh(sandboxID, 3600);
        void load();
      } catch {
        /* ignore */
      }
    },
    [api, load],
  );

  const handlePause = useCallback(
    async (sandboxID: string) => {
      try {
        await api.pause(sandboxID);
        void load();
      } catch {
        /* ignore */
      }
    },
    [api, load],
  );

  const handleResume = useCallback(
    async (sandboxID: string) => {
      try {
        await api.resume(sandboxID, 3600);
        void load();
      } catch {
        /* ignore */
      }
    },
    [api, load],
  );

  const handleDelete = useCallback(
    async (sandboxID: string) => {
      try {
        await api.delete(sandboxID);
        for (const [envId, entry] of catalog.entries) {
          const httpBaseUrl = getHttpBaseUrl(entry);
          if (httpBaseUrl && sandboxIdFromUrl(httpBaseUrl) === sandboxID) {
            await removeEnv(envId);
            break;
          }
        }
        setSandboxes((prev) => prev.filter((s) => s.sandboxID !== sandboxID));
      } catch {
        /* ignore */
      }
    },
    [api, removeEnv, catalog.entries],
  );

  if (!creds.isLoaded || loading) {
    return (
      <Empty className="flex-1">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </Empty>
    );
  }

  if (!creds.hasRequired) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Settings2Icon className="size-4.5" />
          </EmptyMedia>
          <EmptyTitle>凭证未配置</EmptyTitle>
          <EmptyDescription>需要配置 E2B API 密钥才能使用沙箱</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={onNavigateToSettings}>
            配置凭证
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (sandboxes.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CloudIcon className="size-4.5" />
          </EmptyMedia>
          <EmptyTitle>没有沙箱</EmptyTitle>
          <EmptyDescription>创建一个远程沙箱来开始开发</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={onNavigateToCreate}>
            <PlusIcon className="size-4" />
            创建沙箱
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6 md:p-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{sandboxes.length} 个沙箱</p>
          <ToggleGroup
            aria-label="沙箱范围"
            size="xs"
            variant="outline"
            value={[scope]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === "boundly" || next === "all") setScope(next);
            }}
          >
            <Toggle value="boundly">本应用</Toggle>
            <Toggle value="all">全部</Toggle>
          </ToggleGroup>
        </div>
        <Button size="xs" variant="outline" onClick={() => void load()}>
          刷新
        </Button>
      </div>
      {sandboxes.map((sandbox) => (
        <SandboxCard
          key={sandbox.sandboxID}
          sandbox={sandbox}
          fallbackDomain={creds.credentials.sandboxDomain}
          isConnecting={connecting === sandbox.sandboxID}
          onConnect={() => void handleConnect(sandbox)}
          onPause={() => void handlePause(sandbox.sandboxID)}
          onResume={() => void handleResume(sandbox.sandboxID)}
          onRefresh={() => void handleRefresh(sandbox.sandboxID)}
          onDelete={() => void handleDelete(sandbox.sandboxID)}
        />
      ))}
    </div>
  );
}
