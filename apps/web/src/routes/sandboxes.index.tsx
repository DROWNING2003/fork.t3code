import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { CloudCogIcon, PlusIcon } from "lucide-react";

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
        <header className="workspace-topbar flex items-center gap-2 border-b border-border/60 px-3 sm:px-5">
          <CloudCogIcon className="size-4 text-muted-foreground" />
          <span className="truncate text-sm font-medium text-foreground">沙箱</span>
          <div className="ml-auto">
            <Button
              size="sm"
              variant="outline"
              className="border-primary/20 bg-primary/8 text-primary shadow-none hover:border-primary/30 hover:bg-primary/14 [transition:transform_160ms_cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
              onClick={() => void navigate({ to: "/sandboxes/new" })}
            >
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
