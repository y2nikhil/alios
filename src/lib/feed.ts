import { supabase } from "@/integrations/supabase/client";

export type Author = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_icon: string | null;
  avatar_gradient: string | null;
};

export const POST_COLUMNS =
  "id, author_id, title, body, media_url, media_kind, tag, slug, pinned, up_count, down_count, comment_count, created_at";

export type Post = {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  media_url: string | null;
  media_kind: string | null;
  tag: string | null;
  slug?: string | null;
  pinned?: boolean | null;
  up_count: number;
  down_count: number;
  comment_count: number;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  up_count: number;
  down_count: number;
  created_at: string;
};

export const THREAD_COLORS = [
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#ec4899",
];

export const POST_TAGS = ["General", "CAT PREP", "JEE", "NEET", "Govt Exam", "College", "Study Tips", "Resources", "Off-topic"];

/** Percentage of votes that are upvotes (0-100). Null when nobody voted. */
export function upvotePct(up: number, down: number): number | null {
  const total = up + down;
  if (total === 0) return null;
  return Math.round((up / total) * 100);
}

export function hoursSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 36e5;
}

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export type SortKey = "for-you" | "latest" | "top" | "rising" | "controversial";

export function sortPosts(posts: Post[], key: SortKey): Post[] {
  const list = [...posts];
  switch (key) {
    case "latest":
      return list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    case "top":
      return list.sort((a, b) => b.up_count - a.up_count || b.comment_count - a.comment_count);
    case "rising":
      return list.sort((a, b) => risingScore(b) - risingScore(a));
    case "controversial":
      return list.sort((a, b) => controversyScore(b) - controversyScore(a));
    case "for-you":
    default: {
      // Latest on top, most-upvoted and hot ones mixed in below.
      const byNew = [...list].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      const byHot = [...list].sort((a, b) => risingScore(b) - risingScore(a));
      const out: Post[] = [];
      const seen = new Set<string>();
      const push = (p?: Post) => { if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); } };
      let i = 0;
      let j = 0;
      while (out.length < list.length && (i < byNew.length || j < byHot.length)) {
        push(byNew[i++]);
        push(byNew[i++]);
        push(byHot[j++]);
      }
      return out;
    }
  }
}

export function risingScore(p: Post) {
  const votes = p.up_count - p.down_count;
  const engagement = votes + p.comment_count * 2;
  return engagement / Math.pow(hoursSince(p.created_at) + 2, 1.3);
}

export function controversyScore(p: Post) {
  const up = p.up_count;
  const down = p.down_count;
  if (up === 0 || down === 0) return 0;
  const balance = Math.min(up, down) / Math.max(up, down);
  return (up + down) * balance + p.comment_count * 0.5;
}

export async function fetchAuthors(ids: string[]): Promise<Record<string, Author>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_icon, avatar_gradient")
    .in("id", unique);
  const map: Record<string, Author> = {};
  (data ?? []).forEach((a: any) => { map[a.id] = a as Author; });
  return map;
}

export function postPath(post: { slug?: string | null; id: string }) {
  return post.slug ? `/post/${post.slug}` : `/post/${post.id}`;
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export function kindFromFile(file: File): "image" | "video" | "link" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "link";
}

/** Upload an attachment to the post-media bucket and return a long-lived URL. */
export async function uploadPostMedia(userId: string, file: File) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("post-media").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage.from("post-media").createSignedUrl(path, TEN_YEARS);
  if (sErr || !data?.signedUrl) throw sErr ?? new Error("Could not create media URL");
  return { url: data.signedUrl, kind: kindFromFile(file) };
}

export function readingTime(body?: string | null) {
  const words = (body ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
