// Activity tracking is disabled: it wrote a very high volume of rows to the
// database. Kept as no-ops so call sites stay valid.

type Kind = "page_view" | "click" | "custom";

export function trackEvent(
  _kind: Kind,
  _label?: string | null,
  _metadata: Record<string, unknown> = {},
  _path?: string | null,
) {
  /* disabled */
}

export function installClickTracking() {
  return () => {};
}
