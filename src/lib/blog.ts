export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  content: string;
  word_count?: number | null;
  tags: string[] | null;
  status: string;
  show_toc: boolean;
  seo_title: string | null;
  seo_description: string | null;
  keywords: string | null;
  author_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function readingMinutesFromWords(words?: number | null): number {
  return Math.max(1, Math.round((words ?? 0) / 220));
}

export function readingMinutes(md: string): number {
  const words = md.replace(/[#*>`_\-[\]()!]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function plainText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3 | 4; text: string; id: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; text: string }
  | { type: "hr" };

export type TocItem = { id: string; text: string; level: number };

/** Minimal, dependency-free markdown-to-blocks parser tuned for SEO article layout. */
export function parseBlocks(md: string): { blocks: Block[]; toc: TocItem[] } {
  const lines = (md ?? "").replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const toc: TocItem[] = [];
  const used = new Set<string>();
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", text: para.join(" ") });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ type: "list", ordered: list.ordered, items: list.items });
      list = null;
    }
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flush();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length as 1 | 2 | 3 | 4;
      const text = heading[2].trim();
      let id = slugify(text) || `section-${blocks.length}`;
      let n = 2;
      while (used.has(id)) id = `${id}-${n++}`;
      used.add(id);
      blocks.push({ type: "heading", level, text, id });
      if (level >= 2 && level <= 3) toc.push({ id, text, level });
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/.exec(line.trim());
    if (image) {
      flush();
      blocks.push({ type: "image", alt: image[1], src: image[2], caption: image[3] });
      continue;
    }

    if (/^(---|\*\*\*)\s*$/.test(line.trim())) {
      flush();
      blocks.push({ type: "hr" });
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flush();
      blocks.push({ type: "quote", text: quote[1] });
      continue;
    }

    const ul = /^[-*]\s+(.*)$/.exec(line.trim());
    const ol = /^\d+[.)]\s+(.*)$/.exec(line.trim());
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((ul ? ul[1] : ol![1]).trim());
      continue;
    }

    flushList();
    para.push(line.trim());
  }
  flush();

  return { blocks, toc };
}
