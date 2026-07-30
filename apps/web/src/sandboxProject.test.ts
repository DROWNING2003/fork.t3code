import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ProjectId } from "@t3tools/contracts";

import {
  buildSandboxProjectCreateInput,
  findSandboxProject,
  SANDBOX_PROJECT_WORKSPACE_ROOT,
} from "./sandboxProject";

describe("sandbox projects", () => {
  it("reuses a project that already belongs to the connected sandbox", () => {
    const sandboxEnvironmentId = EnvironmentId.make("sandbox-environment");
    const sandboxProjectId = ProjectId.make("sandbox-project");

    expect(
      findSandboxProject(
        [
          { environmentId: EnvironmentId.make("local-environment"), id: ProjectId.make("local") },
          { environmentId: sandboxEnvironmentId, id: sandboxProjectId },
        ],
        sandboxEnvironmentId,
      )?.id,
    ).toBe(sandboxProjectId);
  });

  it("creates a usable default project at the sandbox home directory", () => {
    const projectId = ProjectId.make("sandbox-project");

    expect(buildSandboxProjectCreateInput(projectId)).toEqual({
      projectId,
      title: "Boundly Sandbox",
      workspaceRoot: SANDBOX_PROJECT_WORKSPACE_ROOT,
      createWorkspaceRootIfMissing: true,
      defaultModelSelection: null,
    });
  });
});
