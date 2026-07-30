import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftIcon, CloudIcon } from "lucide-react";

import { SandboxCreateForm } from "../components/sandbox/SandboxCreateForm";
import { Button } from "../components/ui/button";
import { SidebarInset } from "../components/ui/sidebar";

export const Route = createFileRoute("/sandboxes/new")({
  component: SandboxNewPage,
});

function SandboxNewPage() {
  const navigate = useNavigate();

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <header className="workspace-topbar flex items-center gap-2 border-b border-border px-3 py-2 sm:px-5 sm:py-3">
          <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/sandboxes" })}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <CloudIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">创建沙箱</span>
        </header>
        <SandboxCreateForm
          onSuccess={() => void navigate({ to: "/" })}
          onCancel={() => void navigate({ to: "/sandboxes" })}
        />
      </div>
    </SidebarInset>
  );
}
