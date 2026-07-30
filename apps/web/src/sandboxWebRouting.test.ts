import { describe, expect, it } from "vite-plus/test";

import { shouldRedirectSandboxWebChatIndex } from "./sandboxWebRouting";

describe("shouldRedirectSandboxWebChatIndex", () => {
  it("waits for the environment catalog before deciding where to send the user", () => {
    expect(shouldRedirectSandboxWebChatIndex({ catalogReady: false, sandboxCount: 0 })).toBe(false);
  });

  it("sends the public root to the sandbox list when there are no sandboxes", () => {
    expect(shouldRedirectSandboxWebChatIndex({ catalogReady: true, sandboxCount: 0 })).toBe(true);
  });

  it("keeps the chat entry point after a sandbox connects", () => {
    expect(shouldRedirectSandboxWebChatIndex({ catalogReady: true, sandboxCount: 1 })).toBe(false);
  });
});
