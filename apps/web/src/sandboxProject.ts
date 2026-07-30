import type { EnvironmentId, ProjectId } from "@t3tools/contracts";

export const SANDBOX_PROJECT_WORKSPACE_ROOT = "/home/user";

export function findSandboxProject<
  T extends { readonly environmentId: EnvironmentId } & { readonly id: ProjectId },
>(projects: ReadonlyArray<T>, environmentId: EnvironmentId): T | null {
  return projects.find((project) => project.environmentId === environmentId) ?? null;
}

export function buildSandboxProjectCreateInput(projectId: ProjectId) {
  return {
    projectId,
    title: "Boundly Sandbox",
    workspaceRoot: SANDBOX_PROJECT_WORKSPACE_ROOT,
    createWorkspaceRootIfMissing: true,
    defaultModelSelection: null,
  } as const;
}
