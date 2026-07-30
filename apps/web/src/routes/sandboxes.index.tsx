import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { CloudIcon, PlusIcon } from "lucide-react";

import { SandboxList } from "../components/sandbox/SandboxList";
import { Button } from "../components/ui/button";
import { SidebarInset } from "../components/ui/sidebar";

export const Route = createFileRoute("/sandboxes/")({
  component: SandboxesPage,
});

function SandboxesPage() {
  const navigate = useNavigate();

  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <header className="workspace-topbar flex items-center gap-2 border-b border-border px-3 py-2 sm:px-5 sm:py-3">
          <CloudIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">沙箱</span>
          <div className="ml-auto">
            <Button size="sm" onClick={() => void navigate({ to: "/sandboxes/new" })}>
              <PlusIcon className="size-4" />
              创建沙箱
            </Button>
          </div>
        </header>
        <SandboxList
          onNavigateToSettings={() => void navigate({ to: "/settings/sandbox" })}
          onNavigateToCreate={() => void navigate({ to: "/sandboxes/new" })}
        />
      </div>
    </SidebarInset>
  );
}
