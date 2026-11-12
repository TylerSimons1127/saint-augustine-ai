export type ResolvedWindowTarget = {
  kind: "in-app" | "external";
  href: string;
};

/** Classify HTTPS links opened through window.open or target="_blank". */
export function resolveWindowTarget(
  rawUrl: string,
  appOrigin: string,
): ResolvedWindowTarget | null {
  if (typeof rawUrl !== "string" || rawUrl.length > 8192) return null;
  try {
    const app = new URL(appOrigin);
    const target = new URL(rawUrl);
    if (
      app.protocol !== "https:" ||
      app.username ||
      app.password ||
      target.protocol !== "https:" ||
      target.username ||
      target.password
    )
      return null;
    return {
      kind: target.origin === app.origin ? "in-app" : "external",
      href: target.href,
    };
  } catch {
    return null;
  }
}
