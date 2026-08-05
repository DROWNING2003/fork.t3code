import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { PreviewChromeRow } from "./PreviewChromeRow";

describe("PreviewChromeRow", () => {
  it("can place the system-browser action beside refresh", () => {
    const markup = renderToStaticMarkup(
      <PreviewChromeRow
        url="https://5173-sandbox-1.e2b.example.com/"
        loading={false}
        loadProgress={0}
        canGoBack
        canGoForward={false}
        refreshDisabled={false}
        onBack={() => undefined}
        onForward={() => undefined}
        onRefresh={() => undefined}
        onSubmit={() => undefined}
        onOpenInBrowser={() => undefined}
        openInBrowserInNavigation
      />,
    );

    expect(markup.indexOf('aria-label="Refresh"')).toBeGreaterThanOrEqual(0);
    expect(markup.indexOf('aria-label="Open in system browser"')).toBeGreaterThan(
      markup.indexOf('aria-label="Refresh"'),
    );
  });
});
