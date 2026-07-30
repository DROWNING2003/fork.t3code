export function shouldRedirectSandboxWebChatIndex(input: {
  readonly catalogReady: boolean;
  readonly sandboxCount: number;
}): boolean {
  return input.catalogReady && input.sandboxCount === 0;
}

export function resolveSandboxWebRestrictedPathRedirect(pathname: string): string | null {
  if (pathname === "/pair" || pathname === "/connect" || pathname.startsWith("/connect/")) {
    return "/sandboxes";
  }
  if (pathname === "/settings" || pathname.startsWith("/settings/")) {
    return pathname === "/settings/sandbox" ? null : "/sandboxes";
  }
  return null;
}
