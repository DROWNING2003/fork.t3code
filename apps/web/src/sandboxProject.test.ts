import { describe, expect, it } from "vite-plus/test";
import { EnvironmentId, ProjectId } from "@t3tools/contracts";

import {
  buildSandboxProjectCreateInput,
  findSandboxProject,
  findConnectedSandboxMissingProject,
  selectProjectsForActiveEnvironment,
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

  it("waits for a connected sandbox before creating its project", () => {
    const environmentId = EnvironmentId.make("sandbox-environment");

    expect(
      findConnectedSandboxMissingProject(
        [
          {
            environmentId,
            displayUrl: "https://8080-sandboxid.e2b.eirture.cn",
            connection: { phase: "connecting" },
          },
        ],
        [],
      ),
    ).toBeNull();

    expect(
      findConnectedSandboxMissingProject(
        [
          {
            environmentId,
            displayUrl: "https://8080-sandboxid.e2b.eirture.cn",
            connection: { phase: "connected" },
          },
        ],
        [],
      )?.environmentId,
    ).toBe(environmentId);
  });

  it("keeps the landing draft in the selected environment", () => {
    const localEnvironmentId = EnvironmentId.make("local-environment");
    const sandboxEnvironmentId = EnvironmentId.make("sandbox-environment");
    const localProject = { environmentId: localEnvironmentId, id: ProjectId.make("local") };
    const sandboxProject = {
      environmentId: sandboxEnvironmentId,
      id: ProjectId.make("sandbox"),
    };

    expect(
      selectProjectsForActiveEnvironment([localProject, sandboxProject], sandboxEnvironmentId),
    ).toEqual([sandboxProject]);
    expect(selectProjectsForActiveEnvironment([localProject, sandboxProject], null)).toEqual([
      localProject,
      sandboxProject,
    ]);
  });
});
