export type WebSurface = "full" | "sandbox";

export function resolveWebSurface(value: string | undefined): WebSurface {
  return value === "sandbox" ? "sandbox" : "full";
}

export const webSurface = resolveWebSurface(import.meta.env.VITE_BOUNDLY_WEB_SURFACE);
export const isSandboxOnlyWeb = webSurface === "sandbox";
