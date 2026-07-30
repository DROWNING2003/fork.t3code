import { describe, expect, it } from "vite-plus/test";

import { sandboxNavigationItems } from "./sandboxNavigation";

describe("sandboxNavigationItems", () => {
  it("only exposes sandbox lifecycle and credentials", () => {
    expect(sandboxNavigationItems).toEqual([
      { label: "沙箱", to: "/sandboxes" },
      { label: "沙箱凭证", to: "/settings/sandbox" },
    ]);
  });
});
