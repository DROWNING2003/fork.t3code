export function shouldRedirectSandboxWebChatIndex(input: {
  readonly catalogReady: boolean;
  readonly sandboxCount: number;
}): boolean {
  return input.catalogReady && input.sandboxCount === 0;
}
