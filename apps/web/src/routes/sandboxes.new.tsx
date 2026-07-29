import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { SandboxCreateForm } from "../components/sandbox/SandboxCreateForm";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/sandboxes/new")({
  component: SandboxNewPage,
});

function SandboxNewPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 pt-10 pb-7 sm:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/sandboxes" })}>
          <ArrowLeftIcon className="size-4" />
        </Button>
        <h1 className="text-xl font-semibold">创建沙箱</h1>
      </div>
      <SandboxCreateForm
        onSuccess={() => void navigate({ to: "/" })}
        onCancel={() => void navigate({ to: "/sandboxes" })}
      />
    </div>
  );
}
