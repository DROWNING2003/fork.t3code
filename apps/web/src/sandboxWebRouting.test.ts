import { describe, expect, it } from "vite-plus/test";

import { resolveSandboxWebInitialRedirect } from "./sandboxWebRouting";

describe("resolveSandboxWebInitialRedirect", () => {
  it("sends the public root to the sandbox list", () => {
    expect(resolveSandboxWebInitialRedirect("/")).toBe("/sandboxes");
  });

  it.each(["/sandboxes", "/sandboxes/new", "/settings/sandbox"])(
    "keeps sandbox workflow path %s",
    (pathname) => {
      expect(resolveSandboxWebInitialRedirect(pathname)).toBeNull();
    },
  );
});
