import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "https://classlab.in";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const STATIC_PATHS: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/feed", changefreq: "hourly", priority: "0.9" },
  { path: "/blog", changefreq: "daily", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/communities", changefreq: "weekly", priority: "0.8" },
  { path: "/forums", changefreq: "weekly", priority: "0.8" },
  { path: "/study-groups", changefreq: "weekly", priority: "0.8" },
  { path: "/exam-prep", changefreq: "weekly", priority: "0.8" },
  { path: "/exams/jee", changefreq: "weekly", priority: "0.8" },
  { path: "/notes-sharing", changefreq: "weekly", priority: "0.7" },
  { path: "/student-chat", changefreq: "weekly", priority: "0.7" },
  { path: "/watch-party", changefreq: "weekly", priority: "0.7" },
  { path: "/campus-network", changefreq: "weekly", priority: "0.7" },
  { path: "/college-clubs", changefreq: "weekly", priority: "0.7" },
  { path: "/coding-rooms", changefreq: "weekly", priority: "0.7" },
  { path: "/events", changefreq: "weekly", priority: "0.7" },
  { path: "/projects", changefreq: "weekly", priority: "0.7" },
  { path: "/portfolio", changefreq: "weekly", priority: "0.7" },
  { path: "/internships", changefreq: "weekly", priority: "0.7" },
  { path: "/career", changefreq: "weekly", priority: "0.7" },
  { path: "/resources", changefreq: "weekly", priority: "0.7" },
  { path: "/ai-study-assistant", changefreq: "weekly", priority: "0.7" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_PATHS];

        const authorUsernames = new Set<string>();

        try {
          for (let offset = 0; offset < 1000; offset += 200) {
            const { data } = await (supabase as any).rpc("public_posts", { _limit: 200, _offset: offset });
            const rows = (data ?? []) as { slug: string | null; id: string; author_username: string | null }[];
            rows.forEach((p) => {
              entries.push({ path: `/post/${p.slug ?? p.id}`, changefreq: "daily", priority: "0.6" });
              if (p.author_username) authorUsernames.add(p.author_username);
            });
            if (rows.length < 200) break;
          }
        } catch {
          // posts unavailable — still serve the static sitemap
        }

        try {
          const { data } = await (supabase as any)
            .from("blog_posts")
            .select("slug")
            .eq("status", "published")
            .limit(500);
          ((data ?? []) as { slug: string }[]).forEach((b) => {
            entries.push({ path: `/blog/${b.slug}`, changefreq: "weekly", priority: "0.8" });
          });
        } catch {
          // blog unavailable — still serve the rest of the sitemap
        }



        // Only list profiles that have published content; empty profiles are thin pages
        // and Google leaves them in "Discovered – currently not indexed".
        authorUsernames.forEach((username) => {
          entries.push({ path: `/u/${username}`, changefreq: "weekly", priority: "0.5" });
        });

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
