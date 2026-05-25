import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tv, Plus, Globe, Link2, Lock, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { parseYouTube } from "@/lib/youtube";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/party")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Watch Parties — ALIOS" }] }),
  component: PartyLobby,
});

type Party = { id: string; title: string; media_kind: string; host_id: string; started_at: string; visibility: string };

function PartyLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase.from("watch_parties") as any)
        .select("id,title,media_kind,host_id,started_at,visibility")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(24);
      const list = ((data ?? []) as Party[]).filter((p) => p.visibility === "public" || p.host_id === user?.id);
      setParties(list);
      setLoading(false);
      if (list.length) {
        const { data: parts } = await supabase
          .from("watch_party_participants")
          .select("party_id, left_at")
          .in("party_id", list.map((p) => p.id))
          .is("left_at", null);
        const map: Record<string, number> = {};
        (parts ?? []).forEach((p: any) => { map[p.party_id] = (map[p.party_id] ?? 0) + 1; });
        setCounts(map);
      }
    };
    load();
    const ch = supabase
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_parties" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_party_participants" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-cyan-500/10 border border-white/10 p-6 lg:p-8 relative overflow-hidden">
        <div aria-hidden className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-pink-500/30 blur-3xl" />
        <div className="relative flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-pink-200">🎬 Watch parties</p>
            <h1 className="mt-1 text-3xl lg:text-4xl font-bold tracking-tight">Vibe together in real time.</h1>
            <p className="mt-2 text-sm text-foreground/80 max-w-lg">Paste any YouTube, .mp4, Twitch, or website link. Friends watch in perfect sync — like a tiny cinema.</p>
          </div>
          <Button onClick={() => setNewOpen(true)} size="lg" className="bg-gradient-to-r from-pink-500 to-violet-500 shadow-lg shadow-pink-500/30">
            <Plus className="h-4 w-4 mr-1.5" /> Start a party
          </Button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Tv className="h-4 w-4 text-pink-400" />
          <h2 className="font-semibold">Public rooms</h2>
          <span className="text-[10px] text-muted-foreground">· anyone can join</span>
        </div>
        {loading ? (
          <div className="grid place-items-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : parties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">
            No one is hosting yet 🌙 — kick it off with the button above.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {parties.map((p) => (
              <Link
                key={p.id}
                to="/app/hangout/$partyId"
                params={{ partyId: p.id }}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.02] hover:border-pink-500/40 hover:from-pink-500/10 transition p-4"
              >
                <div className="aspect-video rounded-lg bg-black/50 grid place-items-center mb-3 group-hover:scale-[1.02] transition-transform">
                  <Tv className="h-8 w-8 text-pink-400/70" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-pink-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" /> Live
                  <span className="ml-auto text-muted-foreground normal-case">
                    {p.visibility === "private" ? <Lock className="h-3 w-3" /> : p.visibility === "unlisted" ? <Link2 className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-sm truncate">{p.title}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">{counts[p.id] ?? 0} watching · {p.media_kind}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

      <NewPartyDialog open={newOpen} onOpenChange={setNewOpen} userId={user?.id} onCreated={(id) => navigate({ to: "/app/hangout/$partyId", params: { partyId: id } })} />
    </div>
  );
}

export function NewPartyDialog({ open, onOpenChange, userId, onCreated }:
  { open: boolean; onOpenChange: (v: boolean) => void; userId?: string; onCreated?: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted" | "private">("public");
  const [busy, setBusy] = useState(false);

  const PRESETS = [
    { label: "YouTube", emoji: "▶️", sample: "https://youtu.be/", titleHint: "YouTube watch-along" },
    { label: "Movie", emoji: "🎬", sample: "https://example.com/movie.mp4", titleHint: "Movie Night 🍿" },
    { label: "Twitch", emoji: "🎮", sample: "https://player.twitch.tv/?channel=", titleHint: "Twitch stream" },
    { label: "Any site", emoji: "🌐", sample: "https://", titleHint: "Watch together" },
    { label: "Just chat", emoji: "💬", sample: "about:blank", titleHint: "Hangout Room" },
  ];

  const submit = async () => {
    if (!userId || !url.trim()) return;
    setBusy(true);
    const link = url.trim();
    const yt = parseYouTube(link);
    let media_kind = "iframe"; let media_id: string | null = null;
    if (yt && yt.kind === "video") { media_kind = "youtube"; media_id = yt.id; }
    else if (/\.(mp4|webm|m3u8|mov|mkv)(\?|$)/i.test(link)) media_kind = "video";
    else if (link === "about:blank") media_kind = "chat";

    const { data, error } = await (supabase.from("watch_parties") as any).insert({
      host_id: userId, title: title.trim() || "Untitled hangout",
      media_url: link, media_kind, media_id, visibility,
    }).select("id").single();
    setBusy(false);
    if (error || !data) { toast.error(error?.message ?? "Failed to start"); return; }
    onOpenChange(false);
    onCreated?.(data.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-pink-400" /> Start a watch party</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => { setUrl(p.sample); if (!title.trim()) setTitle(p.titleHint); }}
                className="rounded-xl border border-border bg-accent/30 hover:bg-accent hover:border-pink-500/40 p-2 text-center">
                <div className="text-xl">{p.emoji}</div>
                <div className="text-[10px] mt-1">{p.label}</div>
              </button>
            ))}
          </div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Party title (e.g. Inception Rewatch 🎥)" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste any video / stream URL" />

          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Who can join?</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: "public", icon: Globe, label: "Public", hint: "Anyone can find it" },
                { v: "unlisted", icon: Link2, label: "Link only", hint: "Share the link" },
                { v: "private", icon: Lock, label: "Private", hint: "Only you for now" },
              ] as const).map((opt) => (
                <button key={opt.v} onClick={() => setVisibility(opt.v)}
                  className={cn(
                    "rounded-xl border p-2.5 text-left transition",
                    visibility === opt.v ? "border-pink-500/60 bg-pink-500/10" : "border-border bg-accent/30 hover:bg-accent",
                  )}>
                  <opt.icon className="h-3.5 w-3.5" />
                  <p className="text-xs font-semibold mt-1">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.hint}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !url.trim()} className="bg-gradient-to-r from-pink-500 to-violet-500">
            {busy ? "Starting…" : "Go live"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
