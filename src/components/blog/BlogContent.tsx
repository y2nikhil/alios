import { Children, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify, type TocItem } from "@/lib/blog";

export function TableOfContents({ toc, variant = "card" }: { toc: TocItem[]; variant?: "card" | "sidebar" }) {
  if (toc.length < 2) return null;
  const sidebar = variant === "sidebar";
  return (
    <nav
      aria-label="Table of contents"
      className={
        sidebar
          ? "rounded-2xl border border-white/10 bg-white/[0.02] p-4"
          : "my-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      }
    >
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-amber-300">On this page</h2>
      <ol className={sidebar ? "mt-3 space-y-1.5 text-[13px]" : "mt-3 space-y-1.5 text-sm"}>
        {toc.map((t) => (
          <li key={t.id} style={{ paddingLeft: (t.level - 2) * 12 }}>
            <a href={`#${t.id}`} className="block text-muted-foreground hover:text-amber-200 hover:underline">
              {t.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}


function nodeText(children: ReactNode): string {
  let out = "";
  Children.forEach(children, (c: any) => {
    if (c == null || typeof c === "boolean") return;
    if (typeof c === "string" || typeof c === "number") out += String(c);
    else if (c?.props?.children) out += nodeText(c.props.children);
  });
  return out;
}

/** Renders raw markdown (GFM: tables, task lists, strikethrough) as styled HTML. */
export function BlogContent({ markdown }: { markdown: string }) {
  const used = new Set<string>();
  const headingId = (children: ReactNode) => {
    let id = slugify(nodeText(children)) || "section";
    let n = 2;
    while (used.has(id)) id = `${id}-${n++}`;
    used.add(id);
    return id;
  };

  return (
    <div className="blog-body prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-headings:font-bold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:mt-10 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-h4:text-base prose-h4:uppercase prose-h4:tracking-wide prose-h4:text-amber-300/90 prose-p:text-[15px] prose-p:leading-7 prose-p:text-foreground/85 prose-li:text-[15px] prose-li:leading-7 prose-li:text-foreground/85 prose-strong:text-foreground prose-a:font-medium prose-a:text-amber-300 prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-amber-200 prose-blockquote:border-l-2 prose-blockquote:border-amber-400/60 prose-blockquote:not-italic prose-blockquote:text-foreground/80 prose-hr:border-white/10 prose-img:rounded-2xl prose-img:border prose-img:border-white/10 prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-2xl prose-pre:border prose-pre:border-white/10 prose-pre:bg-black/40">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 id={headingId(children)}>{children}</h1>,
          h2: ({ children }) => <h2 id={headingId(children)}>{children}</h2>,
          h3: ({ children }) => <h3 id={headingId(children)}>{children}</h3>,
          h4: ({ children }) => <h4 id={headingId(children)}>{children}</h4>,
          a: ({ href, children }) => {
            const to = href ?? "#";
            if (to.startsWith("/")) return <Link to={to}>{children}</Link>;
            return (
              <a href={to} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} loading="lazy" className="w-full object-cover" />,
          table: ({ children }) => (
            <div className="my-6 -mx-1 overflow-x-auto rounded-2xl border border-white/10">
              <table className="my-0 w-full min-w-[520px] border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/[0.07]">{children}</thead>,
          th: ({ children }) => <th className="border-b border-white/10 px-4 py-3 text-[13px] font-bold uppercase tracking-wide text-amber-200">{children}</th>,
          tr: ({ children }) => <tr className="border-b border-white/5 last:border-0 even:bg-white/[0.02]">{children}</tr>,
          td: ({ children }) => <td className="px-4 py-3 align-top text-[14px] leading-6 text-foreground/85">{children}</td>,
          input: (props) => <input {...props} disabled className="mr-2 align-middle accent-amber-400" />,
        }}
      >
        {markdown ?? ""}
      </ReactMarkdown>
    </div>
  );
}
