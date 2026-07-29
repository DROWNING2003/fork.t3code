import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";

import { SandboxCredentialsWizard } from "../components/sandbox/SandboxCredentialsWizard";
import { SettingsPageContainer } from "../components/settings/settingsLayout";
import { useSandboxCredentials } from "../hooks/useSandboxCredentials";

export const Route = createFileRoute("/settings/sandbox")({
  component: SandboxCredentialsSettings,
});

function SandboxCredentialsSettings() {
  const navigate = useNavigate();
  const credentials = useSandboxCredentials();

  return (
    <SettingsPageContainer>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold">沙箱凭证</h1>
          <p className="text-sm text-muted-foreground">
            配置沙箱 API 凭证，用于创建和管理远程开发沙箱。
          </p>
        </div>
        {credentials.isLoaded ? (
          <SandboxCredentialsWizard
            credentials={credentials}
            onComplete={() => void navigate({ to: "/settings" })}
            onCancel={() => void navigate({ to: "/settings" })}
          />
        ) : (
          <div className="text-sm text-muted-foreground">加载中...</div>
        )}
      </div>
    </SettingsPageContainer>
  );
}
