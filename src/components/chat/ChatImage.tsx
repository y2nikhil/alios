import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageIcon } from "lucide-react";

const cache = new Map<string, string>();

export function ChatImage({ path, alt }: { path: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(cache.get(path) ?? null);
  useEffect(() => {
    if (cache.has(path)) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 3600);
      if (!cancelled && data?.signedUrl) {
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [path]);

  if (!url) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 px-3 rounded-lg bg-accent/40 min-w-[200px]">
        <ImageIcon className="h-3.5 w-3.5" /> loading image…
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="block">
      <img src={url} alt={alt ?? "attachment"} className="rounded-xl max-h-72 max-w-sm object-cover border border-border" loading="lazy" />
    </a>
  );
}
