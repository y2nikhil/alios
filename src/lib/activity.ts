import { supabase } from "@/integrations/supabase/client";

type Kind = "page_view" | "click" | "custom";

let queue: Array<{ kind: Kind; path: string | null; label: string | null; metadata: Record<string, unknown> }> = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastKey = "";
let lastAt = 0;

async function flush() {
  timer = null;
  const batch = queue;
  queue = [];
  if (!batch.length) return;
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id;
  if (!uid) return;
  await supabase.from("activity_events").insert(
    batch.map((e) => ({ user_id: uid, kind: e.kind, path: e.path, label: e.label, metadata: e.metadata as never })),
  );
}

export function trackEvent(
  kind: Kind,
  label?: string | null,
  metadata: Record<string, unknown> = {},
  path?: string | null,
) {
  if (typeof window === "undefined") return;
  const p = path ?? window.location.pathname;
  const key = `${kind}|${p}|${label ?? ""}`;
  const now = Date.now();
  // de-dupe identical bursts within 1.5s
  if (key === lastKey && now - lastAt < 1500) return;
  lastKey = key;
  lastAt = now;
  queue.push({ kind, path: p, label: label ?? null, metadata });
  if (queue.length >= 20) { void flush(); return; }
  if (!timer) timer = setTimeout(() => void flush(), 2500);
}

/** Attach a global click listener capturing button / link labels. */
export function installClickTracking() {
  if (typeof window === "undefined") return () => {};
  const handler = (ev: MouseEvent) => {
    const el = (ev.target as HTMLElement | null)?.closest?.(
      "button, a, [role='button'], [role='tab'], [data-track]",
    ) as HTMLElement | null;
    if (!el) return;
    const label =
      el.getAttribute("data-track") ||
      el.getAttribute("aria-label") ||
      (el.innerText || "").trim().split("\n")[0]?.slice(0, 60) ||
      el.tagName.toLowerCase();
    trackEvent("click", label, {
      tag: el.tagName.toLowerCase(),
      href: el.getAttribute("href") ?? undefined,
    });
  };
  window.addEventListener("click", handler, { capture: true });
  const onHide = () => { void flush(); };
  window.addEventListener("pagehide", onHide);
  return () => {
    window.removeEventListener("click", handler, { capture: true } as never);
    window.removeEventListener("pagehide", onHide);
  };
}
