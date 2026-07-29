import type { SandboxInfo } from "@t3tools/shared/sandbox";
import { useAtomValue } from "@effect/atom-react";
import { LoaderIcon, PlusIcon, Settings2Icon } from "lucide-react";
import * as Option from "effect/Option";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { environmentCatalog } from "../../connection/catalog";
import { useSandboxCredentials } from "../../hooks/useSandboxCredentials";
import { useSandboxApi } from "../../hooks/useSandboxApi";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import { SandboxCard } from "./SandboxCard";

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
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const catalog = useAtomValue(environmentCatalog.catalogValueAtom);
  const removeEnv = useAtomCommand(environmentCatalog.remove, "sandbox environment remove");

  const load = useCallback(async () => {
    if (!creds.hasRequired) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api.listSandboxes();
      const apiIds = new Set(list.map((s) => s.sandboxID));
      // remove any stale environments that match a deleted sandbox
      for (const [envId, entry] of catalog.entries) {
        const httpBaseUrl = getHttpBaseUrl(entry);
        if (!httpBaseUrl) continue;
        const sandboxID = sandboxIdFromUrl(httpBaseUrl);
        if (sandboxID && !apiIds.has(sandboxID)) {
          await removeEnv(envId);
        }
      }
      setSandboxes(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sandboxes");
    } finally {
      setLoading(false);
    }
  }, [api, creds.hasRequired, removeEnv, catalog.entries]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConnect = useCallback(
    async (sandbox: SandboxInfo) => {
      setConnecting(sandbox.sandboxID);
      try {
        const connected = await api.connectSandbox(sandbox.sandboxID, 3600);
        await connect(connected as SandboxInfo);
        void navigate({ to: "/" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection failed";
        setError(msg);
      } finally {
        setConnecting(null);
      }
    },
    [api, connect],
  );

  const handleRefresh = useCallback(
    async (sandboxID: string) => {
      try {
        await api.refreshSandbox(sandboxID, 3600);
        void load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Refresh failed");
      }
    },
    [api, load],
  );

  const handleDelete = useCallback(
    async (sandboxID: string) => {
      try {
        await api.deleteSandbox(sandboxID);
        for (const [envId, entry] of catalog.entries) {
          const httpBaseUrl = getHttpBaseUrl(entry);
          if (httpBaseUrl && sandboxIdFromUrl(httpBaseUrl) === sandboxID) {
            await removeEnv(envId);
            break;
          }
        }
        setSandboxes((prev) => prev.filter((s) => s.sandboxID !== sandboxID));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [api, removeEnv, catalog.entries],
  );

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
        <Settings2Icon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">需要配置沙箱凭证才能使用</p>
        <Button onClick={onNavigateToSettings}>配置凭证</Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={load}>
          重试
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sandboxes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">还没有沙箱</p>
        <Button onClick={onNavigateToCreate}>
          <PlusIcon className="size-4" />
          创建沙箱
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">运行中的沙箱</h2>
        <Button size="sm" variant="outline" onClick={load}>
          刷新列表
        </Button>
      </div>
      {sandboxes.map((sandbox) => (
        <SandboxCard
          key={sandbox.sandboxID}
          sandbox={sandbox}
          fallbackDomain={creds.credentials.sandboxDomain}
          onConnect={() => void handleConnect(sandbox)}
          onRefresh={() => void handleRefresh(sandbox.sandboxID)}
          onDelete={() => void handleDelete(sandbox.sandboxID)}
        />
      ))}
    </div>
  );
}
