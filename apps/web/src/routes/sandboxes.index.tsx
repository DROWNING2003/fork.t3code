import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";

import { SandboxList } from "../components/sandbox/SandboxList";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/sandboxes/")({
  component: SandboxesPage,
});

function SandboxesPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-10 pb-7 sm:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/" })}>
            <ArrowLeftIcon className="size-4" />
          </Button>
          <h1 className="text-xl font-semibold">沙箱</h1>
        </div>
        <Button onClick={() => void navigate({ to: "/sandboxes/new" })}>
          <PlusIcon className="size-4" />
          创建沙箱
        </Button>
      </div>
      <SandboxList
        onNavigateToSettings={() => void navigate({ to: "/settings/sandbox" })}
        onNavigateToCreate={() => void navigate({ to: "/sandboxes/new" })}
      />
    </div>
  );
}
