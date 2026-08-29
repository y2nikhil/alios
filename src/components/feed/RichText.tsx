import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const PROSE =
  "prose prose-invert max-w-none prose-p:my-2 prose-p:leading-relaxed prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-foreground prose-a:text-amber-300 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-amber-200 prose-blockquote:border-l-2 prose-blockquote:border-amber-400/60 prose-blockquote:not-italic prose-blockquote:text-foreground/80 prose-hr:border-white/10 prose-img:rounded-xl prose-img:border prose-img:border-white/10 prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40 prose-table:text-[13px] prose-th:border prose-th:border-white/10 prose-th:bg-white/5 prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-white/10 prose-td:px-2 prose-td:py-1";

/** Markdown (GFM) renderer for feed posts and comments. Links open safely in a new tab. */
export const RichText = memo(function RichText({
  text,
  className,
  size = "sm",
}: {
  text: string;
  className?: string;
  size?: "sm" | "xs";
}) {
  return (
    <div className={cn(PROSE, size === "sm" ? "text-sm" : "text-[13px]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer nofollow">
              {children}
            </a>
          ),
          img: ({ src, alt }) => <img src={src as string} alt={alt ?? ""} loading="lazy" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
});

/** Strips markdown syntax for compact previews and clamped list items. */
export function stripMarkdown(md: string): string {
  return (md ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
