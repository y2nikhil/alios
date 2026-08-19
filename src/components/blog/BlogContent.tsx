import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { Block, TocItem } from "@/lib/blog";

/** Renders **bold**, *italic*, `code` and [links](url) inside a text run. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const k = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={k}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={k} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.85em]">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("*")) out.push(<em key={k}>{tok.slice(1, -1)}</em>);
    else {
      const lm = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!;
      const [, label, href] = lm;
      if (href.startsWith("/")) {
        out.push(
          <Link key={k} to={href} className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200">
            {label}
          </Link>,
        );
      } else {
        out.push(
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-amber-300 underline underline-offset-2 hover:text-amber-200">
            {label}
          </a>,
        );
      }
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function TableOfContents({ toc }: { toc: TocItem[] }) {
  if (toc.length < 2) return null;
  return (
    <nav aria-label="Table of contents" className="my-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-300">Table of contents</h2>
      <ol className="mt-3 space-y-1.5 text-sm">
        {toc.map((t) => (
          <li key={t.id} style={{ paddingLeft: (t.level - 2) * 14 }}>
            <a href={`#${t.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
              {t.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BlogContent({ blocks }: { blocks: Block[] }) {
  return (
    <div className="blog-body space-y-4">
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        switch (b.type) {
          case "heading": {
            const cls =
              b.level === 1
                ? "mt-8 text-3xl font-bold tracking-tight"
                : b.level === 2
                  ? "mt-8 text-2xl font-bold tracking-tight"
                  : b.level === 3
                    ? "mt-6 text-xl font-semibold"
                    : "mt-5 text-base font-semibold uppercase tracking-wide text-amber-300/90";
            const Tag = `h${b.level}` as "h1" | "h2" | "h3" | "h4";
            return (
              <Tag key={key} id={b.id} className={cls}>
                {inline(b.text, key)}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={key} className="text-[15px] leading-7 text-foreground/85">
                {inline(b.text, key)}
              </p>
            );
          case "image":
            return (
              <figure key={key} className="my-6">
                <img src={b.src} alt={b.alt} loading="lazy" className="w-full rounded-2xl border border-white/10 object-cover" />
                {b.caption && <figcaption className="mt-2 text-center text-xs text-muted-foreground">{b.caption}</figcaption>}
              </figure>
            );
          case "list":
            return b.ordered ? (
              <ol key={key} className="ml-5 list-decimal space-y-1.5 text-[15px] leading-7 text-foreground/85">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key} className="ml-5 list-disc space-y-1.5 text-[15px] leading-7 text-foreground/85">
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it, `${key}-${j}`)}</li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={key} className="border-l-2 border-amber-400/60 pl-4 text-[15px] italic leading-7 text-foreground/80">
                {inline(b.text, key)}
              </blockquote>
            );
          case "hr":
            return <hr key={key} className="my-8 border-white/10" />;
          default:
            return <Fragment key={key} />;
        }
      })}
    </div>
  );
}
