import { describe, expect, it } from "vite-plus/test";

import {
  resolveSandboxWebRestrictedPathRedirect,
  shouldRedirectSandboxWebEnvironment,
  shouldRedirectSandboxWebChatIndex,
} from "./sandboxWebRouting";

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

describe("resolveSandboxWebRestrictedPathRedirect", () => {
  it.each(["/connect", "/connect/callback", "/pair", "/settings", "/settings/connections"])(
    "sends unsupported public path %s to the sandbox list",
    (pathname) => {
      expect(resolveSandboxWebRestrictedPathRedirect(pathname)).toBe("/sandboxes");
    },
  );

  it.each(["/sandboxes", "/sandboxes/new", "/settings/sandbox", "/draft/example", "/env/thread"])(
    "allows sandbox workflow path %s",
    (pathname) => {
      expect(resolveSandboxWebRestrictedPathRedirect(pathname)).toBeNull();
    },
  );
});

describe("shouldRedirectSandboxWebEnvironment", () => {
  it("waits for the catalog before rejecting an environment", () => {
    expect(
      shouldRedirectSandboxWebEnvironment({
        catalogReady: false,
        displayUrl: "https://1-abc.example.com",
      }),
    ).toBe(false);
  });

  it("allows a sandbox environment", () => {
    expect(
      shouldRedirectSandboxWebEnvironment({
        catalogReady: true,
        displayUrl: "https://1-abc.example.com",
      }),
    ).toBe(false);
  });

  it.each([null, "https://localhost:8080", "https://remote.example.com"])(
    "rejects a non-sandbox environment URL %s",
    (displayUrl) => {
      expect(shouldRedirectSandboxWebEnvironment({ catalogReady: true, displayUrl })).toBe(true);
    },
  );
});
