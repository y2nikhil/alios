import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MENTION_RE = /(^|\s)@([A-Za-z0-9_]{2,32})/g;

/** Render text with @mentions styled and linked (if user exists). */
export function MentionText({ text, meId }: { text: string; meId?: string | null }) {
  const [handles, setHandles] = useState<Map<string, { id: string } | null>>(new Map());

  const found = Array.from(text.matchAll(MENTION_RE)).map((m) => m[2].toLowerCase());

  useEffect(() => {
    const missing = found.filter((h) => !handles.has(h));
    if (missing.length === 0) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("id, username").in("username", missing);
      const next = new Map(handles);
      missing.forEach((h) => next.set(h, null));
      (data ?? []).forEach((p: any) => next.set((p.username ?? "").toLowerCase(), { id: p.id }));
      setHandles(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE);
  while ((m = re.exec(text)) !== null) {
    const start = m.index + m[1].length;
    if (last < start) parts.push(text.slice(last, start));
    const handle = m[2].toLowerCase();
    const profile = handles.get(handle);
    const isMe = profile && meId && profile.id === meId;
    if (profile) {
      parts.push(
        <Link
          key={start}
          to="/app/u/$userId"
          params={{ userId: profile.id }}
          className={
            "font-semibold rounded px-1 -mx-0.5 " +
            (isMe ? "bg-amber-400/25 text-amber-200" : "bg-primary/20 text-primary hover:underline")
          }
        >
          @{m[2]}
        </Link>,
      );
    } else {
      parts.push(<span key={start} className="text-muted-foreground">@{m[2]}</span>);
    }
    last = start + m[2].length + 1;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
