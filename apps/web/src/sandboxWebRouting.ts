export function resolveSandboxWebInitialRedirect(pathname: string): string | null {
  return pathname === "/" ? "/sandboxes" : null;
}
