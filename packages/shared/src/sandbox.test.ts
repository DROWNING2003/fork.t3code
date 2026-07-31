import { describe, expect, it } from "vite-plus/test";

import { buildSkillInstallCommands } from "./sandbox.js";

describe("buildSkillInstallCommands", () => {
  it("installs skills into OpenCode's global skill directory", () => {
    const commands = buildSkillInstallCommands([{ name: "sandbox-preview-url", content: "skill" }]);

    expect(commands).toContain(
      "mkdir -p /home/user/.codex/skills/sandbox-preview-url /home/user/.agents/skills/sandbox-preview-url /home/user/.config/opencode/skills/sandbox-preview-url /home/user/.opencode/skills/sandbox-preview-url",
    );
    expect(commands).toContain(
      "cp /home/user/.codex/skills/sandbox-preview-url/SKILL.md /home/user/.config/opencode/skills/sandbox-preview-url/SKILL.md",
    );
    expect(commands).toContain(
      "cp /home/user/.codex/skills/sandbox-preview-url/SKILL.md /home/user/.agents/skills/sandbox-preview-url/SKILL.md",
    );
  });
});
