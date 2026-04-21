// Pure helpers — safe in client and server
export function parseYouTube(input: string): { kind: "video" | "playlist"; id: string } | null {
  const url = input.trim();
  // playlist
  const playlistMatch = url.match(/[?&]list=([A-Za-z0-9_-]+)/);
  if (playlistMatch && /youtube\.com\/playlist/i.test(url)) {
    return { kind: "playlist", id: playlistMatch[1] };
  }
  // youtu.be short
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (short) return { kind: "video", id: short[1] };
  // watch?v=
  const long = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (long) return { kind: "video", id: long[1] };
  // bare ID
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return { kind: "video", id: url };
  return null;
}

export const ytEmbedUrl = (videoId: string) =>
  `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&iv_load_policy=3&showinfo=0&fs=1`;

export const ytThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
