import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const cache = new Map<string, string>();

function fmtSize(n?: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FileAttachment({
  path, name, mime, size, mine,
}: {
  path: string; name?: string | null; mime?: string | null; size?: number | null; mine?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(cache.get(path) ?? null);

  useEffect(() => {
    if (cache.has(path)) return;
    let stop = false;
    (async () => {
      const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 3600, { download: name ?? true });
      if (!stop && data?.signedUrl) { cache.set(path, data.signedUrl); setUrl(data.signedUrl); }
    })();
    return () => { stop = true; };
  }, [path, name]);

  const isPdf = mime === "application/pdf" || name?.toLowerCase().endsWith(".pdf");
  const Icon = isPdf ? FileText : FileIcon;
  const label = name ?? path.split("/").pop() ?? "attachment";

  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" download={name ?? true}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-2.5 min-w-[240px] max-w-sm transition hover:border-primary/60",
        mine ? "border-primary-foreground/25 bg-primary-foreground/10" : "border-border bg-accent/40",
      )}>
      <div className={cn("h-10 w-10 rounded-lg grid place-items-center shrink-0",
        isPdf ? "bg-rose-500/20 text-rose-300" : "bg-sky-500/20 text-sky-300")}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-[11px] opacity-70">{[mime, fmtSize(size)].filter(Boolean).join(" · ") || "file"}</p>
      </div>
      <Download className="h-4 w-4 opacity-60 shrink-0" />
    </a>
  );
}
