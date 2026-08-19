import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/SiteFooter";

export type FeaturePageContent = {
  slug: string;
  eyebrow: string;
  title: string;
  headline: string;
  subhead: string;
  overview: string;
  icon: LucideIcon;
  features: { title: string; desc: string }[];
  steps: { title: string; desc: string }[];
  benefits: string[];
  faqs: { q: string; a: string }[];
  related: { label: string; to: string }[];
  /** Unique long-form content for this page — keeps it distinct from sibling pages. */
  deepDive?: { heading: string; paragraphs: string[] }[];
  /** Who the page is for, with a concrete scenario each. */
  audience?: { title: string; desc: string }[];
};

export function featureHead(
  c: FeaturePageContent,
  meta: { metaTitle: string; description: string; keywords: string; pageType?: "WebPage" | "CollectionPage" },
) {
  const url = `https://classlab.in/${c.slug}`;
  return {
    meta: [
      { title: meta.metaTitle },
      { name: "description", content: meta.description },
      { name: "keywords", content: meta.keywords },
      { property: "og:title", content: meta.metaTitle },
      { property: "og:description", content: meta.description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: meta.metaTitle },
      { name: "twitter:description", content: meta.description },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": meta.pageType ?? "WebPage",
              name: meta.metaTitle,
              description: meta.description,
              url,
              isPartOf: { "@type": "WebSite", name: "ClassLab", url: "https://classlab.in" },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://classlab.in/" },
                { "@type": "ListItem", position: 2, name: c.title, item: url },
              ],
            },
            {
              "@type": "FAQPage",
              mainEntity: c.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            },
          ],
        }),
      },
    ],
  };
}

export function FeaturePage({ c }: { c: FeaturePageContent }) {
  const Icon = c.icon;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" className="font-semibold tracking-tight">
            ClassLab
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Log in
            </Link>
            <Button asChild size="sm" className="rounded-xl">
              <Link to="/signup">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-5 pt-6 text-xs text-muted-foreground">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link to="/" className="hover:text-foreground">Home</Link>
          </li>
          <li aria-hidden><ChevronRight className="h-3 w-3" /></li>
          <li className="text-foreground">{c.title}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary" /> {c.eyebrow}
        </span>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">{c.headline}</h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{c.subhead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-xl">
            <Link to="/signup">
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-xl">
            <Link to="/">Explore ClassLab</Link>
          </Button>
        </div>
      </section>

      {/* Overview */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="rounded-3xl border border-border bg-card p-8 sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">What is {c.title} on ClassLab?</h2>
          <p className="mt-4 max-w-3xl text-muted-foreground leading-relaxed">{c.overview}</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Features</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {c.features.map((f) => (
            <article key={f.title} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {c.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {i + 1}
              </span>
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Benefits */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Benefits</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {c.benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-2xl border border-border bg-card px-5 py-4">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Who it's for */}
      {c.audience?.length ? (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <h2 className="text-2xl font-semibold tracking-tight">Who {c.title} is for</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {c.audience.map((a) => (
              <article key={a.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-semibold">{a.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Deep dive */}
      {c.deepDive?.length ? (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="grid gap-8 lg:grid-cols-2">
            {c.deepDive.map((d) => (
              <article key={d.heading} className="rounded-3xl border border-border bg-card p-8">
                <h2 className="text-xl font-semibold tracking-tight">{d.heading}</h2>
                {d.paragraphs.map((para) => (
                  <p key={para} className="mt-4 text-sm text-muted-foreground leading-relaxed">{para}</p>
                ))}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <div className="mt-6 divide-y divide-border rounded-3xl border border-border bg-card">
          {c.faqs.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="cursor-pointer list-none font-medium marker:hidden">{f.q}</summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="rounded-3xl border border-primary/30 bg-primary/[0.06] p-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready to join your campus on ClassLab?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Free for students. Set up your profile in under a minute and start collaborating today.
          </p>
          <Button asChild size="lg" className="mt-7 rounded-xl">
            <Link to="/signup">
              Create your free account <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <h2 className="text-sm font-semibold">Explore more on ClassLab</h2>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {c.related.map((r) => (
              <li key={r.to}>
                <Link to={r.to as never} className="hover:text-foreground">{r.label}</Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-muted-foreground">© {new Date().getFullYear()} ClassLab · classlab.in</p>
        </div>
      </footer>
    <SiteFooter />
    </main>
  );
}
