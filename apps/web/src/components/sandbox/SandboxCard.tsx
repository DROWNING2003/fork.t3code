import type { SandboxInfo } from "@t3tools/shared/sandbox";
import {
  ExternalLinkIcon,
  LoaderCircleIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardPanel, CardFooter } from "../ui/card";

interface Props {
  readonly sandbox: SandboxInfo;
  readonly fallbackDomain?: string;
  readonly pendingAction: SandboxAction | null;
  readonly onConnect: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onRefresh: () => void;
  readonly onDelete: () => void;
}

export type SandboxAction = "connect" | "pause" | "resume" | "refresh" | "delete";

export function SandboxCard({
  sandbox,
  pendingAction,
  onConnect,
  onPause,
  onResume,
  onRefresh,
  onDelete,
}: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const msLeft = new Date(sandbox.endAt).getTime() - now;
  const minutesLeft = Math.max(0, Math.floor(msLeft / 60_000));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{sandbox.alias || sandbox.sandboxID.slice(0, 8)}</CardTitle>
        <span
          className={`text-xs font-medium ${minutesLeft < 30 ? "text-amber-500" : "text-muted-foreground"}`}
        >
          {msLeft > 0 ? `${minutesLeft}m remaining` : "Expired"}
        </span>
      </CardHeader>
      <CardPanel>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span
            className={`capitalize font-medium ${sandbox.state === "paused" ? "text-amber-500" : ""}`}
          >
            {sandbox.state}
          </span>
          <span className="font-mono">{sandbox.sandboxID.slice(0, 12)}</span>
          {sandbox.domain && (
            <>
              <ExternalLinkIcon className="size-3 shrink-0" />
              <span className="truncate">{sandbox.domain}</span>
            </>
          )}
        </div>
      </CardPanel>
      <CardFooter>
        <div className="flex flex-wrap items-center gap-2">
          {sandbox.state === "running" ? (
            <>
              <Button size="xs" onClick={onConnect} disabled={pendingAction !== null}>
                {pendingAction === "connect" && (
                  <LoaderCircleIcon className="size-3 animate-spin" />
                )}
                {pendingAction === "connect" ? "连接中" : "连接"}
              </Button>
              <Button
                size="icon-xs"
                variant="outline"
                onClick={onPause}
                disabled={pendingAction !== null}
                aria-label="暂停"
                title="暂停"
              >
                {pendingAction === "pause" ? (
                  <LoaderCircleIcon className="size-3 animate-spin" />
                ) : (
                  <PauseIcon className="size-3" />
                )}
              </Button>
            </>
          ) : (
            <Button size="xs" onClick={onResume} disabled={pendingAction !== null}>
              {pendingAction === "resume" ? (
                <LoaderCircleIcon className="size-3 animate-spin" />
              ) : (
                <PlayIcon className="size-3" />
              )}
              {pendingAction === "resume" ? "恢复中" : "恢复"}
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="outline"
            onClick={onRefresh}
            disabled={pendingAction !== null}
            aria-label="刷新"
            title="刷新"
          >
            <RefreshCwIcon className="size-3" />
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            onClick={onDelete}
            disabled={pendingAction !== null}
            className="text-destructive-foreground"
            aria-label="删除"
            title="删除"
          >
            {pendingAction === "delete" ? (
              <LoaderCircleIcon className="size-3 animate-spin" />
            ) : (
              <Trash2Icon className="size-3" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
