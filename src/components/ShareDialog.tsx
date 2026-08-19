import { useEffect, useState } from "react";
import { Check, Copy, Link2, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  /** Absolute or app-relative url. Relative paths are resolved against the current origin. */
  url: string;
  title: string;
  text?: string;
  label?: string;
  className?: string;
};

const APPS = [
  { key: "whatsapp", label: "WhatsApp", emoji: "🟢", href: (u: string, t: string) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}` },
  { key: "telegram", label: "Telegram", emoji: "🔵", href: (u: string, t: string) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "x", label: "X", emoji: "✖️", href: (u: string, t: string) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  { key: "linkedin", label: "LinkedIn", emoji: "💼", href: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { key: "facebook", label: "Facebook", emoji: "📘", href: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { key: "reddit", label: "Reddit", emoji: "👽", href: (u: string, t: string) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}` },
];

export function ShareDialog({ url, title, text, label = "Share", className }: Props) {
  const [open, setOpen] = useState(false);
  const [absolute, setAbsolute] = useState(url);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAbsolute(url.startsWith("http") ? url : new URL(url, window.location.origin).toString());
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — select the link and copy manually.");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className ?? "rounded-full border-border bg-transparent"}
        onClick={() => setOpen(true)}
      >
        <Share2 className="mr-1.5 h-3.5 w-3.5" /> {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4 text-primary" /> Share this article
            </DialogTitle>
          </DialogHeader>

          <p className="line-clamp-2 text-sm text-muted-foreground">{title}</p>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 p-2">
            <Link2 className="ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              readOnly
              value={absolute}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Shareable link"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
            <Button size="sm" onClick={copy} className="h-8 rounded-lg px-3">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {APPS.map((a) => (
              <a
                key={a.key}
                href={a.href(absolute, title)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-[11px] font-medium transition-colors hover:bg-secondary"
              >
                <span className="text-lg" aria-hidden>{a.emoji}</span>
                {a.label}
              </a>
            ))}
            <a
              href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${text ?? title}\n\n${absolute}`)}`}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-[11px] font-medium transition-colors hover:bg-secondary"
            >
              <Mail className="h-4 w-4" />
              Email
            </a>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                type="button"
                onClick={() => navigator.share?.({ title, text, url: absolute }).catch(() => {})}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-[11px] font-medium transition-colors hover:bg-secondary"
              >
                <Share2 className="h-4 w-4" />
                More
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
