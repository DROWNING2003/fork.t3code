import type { SandboxInfo } from "@t3tools/shared/sandbox";
import { CloudOffIcon, ExternalLinkIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatRelativeTimeLabel } from "../../timestampFormat";
import { Button } from "../ui/button";

interface Props {
  readonly sandbox: SandboxInfo;
  readonly fallbackDomain?: string;
  readonly onConnect: () => void;
  readonly onRefresh: () => void;
  readonly onDelete: () => void;
}

export function SandboxCard({ sandbox, onConnect, onRefresh, onDelete }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const msLeft = new Date(sandbox.endAt).getTime() - now;
  const minutesLeft = Math.max(0, Math.floor(msLeft / 60_000));
  const isExpiring = minutesLeft < 30;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {sandbox.alias || sandbox.sandboxID.slice(0, 8)}
          </span>
          <span className="text-xs text-muted-foreground">{sandbox.sandboxID.slice(0, 12)}</span>
        </div>
        <span
          className={`text-xs font-medium ${isExpiring ? "text-amber-500" : "text-muted-foreground"}`}
        >
          {minutesLeft > 0 ? `${minutesLeft}m left` : "Expired"}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CloudOffIcon className="size-3" />
        <span>{sandbox.state}</span>
        {sandbox.domain && (
          <>
            <ExternalLinkIcon className="size-3" />
            <span className="truncate">{sandbox.domain}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onConnect} disabled={sandbox.state !== "running"}>
          连接
        </Button>
        <Button size="sm" variant="outline" onClick={onRefresh}>
          <RefreshCwIcon className="size-3" />
          刷新
        </Button>
        <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive">
          <Trash2Icon className="size-3" />
        </Button>
      </div>
    </div>
  );
}
