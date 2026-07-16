import { createFileRoute } from "@tanstack/react-router";
import { parseYouTube, ytThumb } from "@/lib/youtube";

type VideoMeta = { videoId: string; title: string; thumbnail: string };

async function fetchVideoTitle(id: string): Promise<string> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    if (!r.ok) return `Video ${id}`;
    const j = (await r.json()) as { title?: string };
    return j.title || `Video ${id}`;
  } catch {
    return `Video ${id}`;
  }
}

async function fetchPlaylistVideos(playlistId: string): Promise<VideoMeta[]> {
  const r = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ClassLab/1.0)",
      "Accept-Language": "en",
    },
  });
  if (!r.ok) return [];
  const html = await r.text();
  const seen = new Set<string>();
  const out: VideoMeta[] = [];
  const re = /"videoId":"([A-Za-z0-9_-]{11})"[^}]*?"title":\{"runs":\[\{"text":"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && out.length < 200) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ videoId: id, title: m[2].replace(/\\u0026/g, "&"), thumbnail: ytThumb(id) });
  }
  if (out.length === 0) {
    // fallback: find video IDs only
    const ids = Array.from(html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)).map((x) => x[1]);
    for (const id of Array.from(new Set(ids)).slice(0, 50)) {
      const title = await fetchVideoTitle(id);
      out.push({ videoId: id, title, thumbnail: ytThumb(id) });
    }
  }
  return out;
}

export const Route = createFileRoute("/api/youtube-parse")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { url?: string };
          if (!body.url) return new Response(JSON.stringify({ error: "Missing url" }), { status: 400 });
          const parsed = parseYouTube(body.url);
          if (!parsed) return new Response(JSON.stringify({ error: "Not a YouTube URL" }), { status: 400 });
          if (parsed.kind === "video") {
            const title = await fetchVideoTitle(parsed.id);
            return new Response(JSON.stringify({ kind: "video", videos: [{ videoId: parsed.id, title, thumbnail: ytThumb(parsed.id) }] }), {
              headers: { "Content-Type": "application/json" },
            });
          }
          const videos = await fetchPlaylistVideos(parsed.id);
          return new Response(JSON.stringify({ kind: "playlist", videos }), { headers: { "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
        }
      },
    },
  },
});
