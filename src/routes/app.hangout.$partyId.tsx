import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play, Pause, Send, Users, Tv, LogOut, Crown, Loader2, ArrowLeft, RotateCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { parseYouTube, ytEmbedUrl } from "@/lib/youtube";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/hangout/$partyId")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Hangout — ALIOS" }] }),
  component: HangoutRoom,
});

type Party = {
  id: string;
  host_id: string;
  title: string;
  media_url: string;
  media_kind: string;
  media_id: string | null;
  current_time_sec: number;
  is_playing: boolean;
  started_at: string;
  ended_at: string | null;
};

type Participant = { id: string; user_id: string; joined_at: string; left_at: string | null; email?: string };
type ChatMsg = { id: string; user_id: string; body: string; created_at: string; email?: string };

function detectMedia(url: string): { kind: "youtube" | "video" | "iframe"; id?: string; embedUrl: string } {
  const yt = parseYouTube(url);
  if (yt && yt.kind === "video") {
    return { kind: "youtube", id: yt.id, embedUrl: ytEmbedUrl(yt.id) + "&enablejsapi=1&playsinline=1" };
  }
  if (/\.(mp4|webm|m3u8|mov|mkv)(\?|$)/i.test(url)) {
    return { kind: "video", embedUrl: url };
  }
  return { kind: "iframe", embedUrl: url };
}

function HangoutRoom() {
  const { partyId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const lastRemoteUpdate = useRef<number>(0);

  const isHost = !!user && !!party && user.id === party.host_id;

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.from("watch_parties").select("*").eq("id", partyId).single();
      if (error || !data) {
        toast.error("Party not found");
        navigate({ to: "/app/collaborate" });
        return;
      }
      setParty(data as Party);

      await supabase.from("watch_party_participants").upsert(
        { party_id: partyId, user_id: user.id, left_at: null },
        { onConflict: "party_id,user_id" },
      );

      setLoading(false);
    })();
    return () => {
      if (user) {
        supabase
          .from("watch_party_participants")
          .update({ left_at: new Date().toISOString() })
          .eq("party_id", partyId)
          .eq("user_id", user.id)
          .then(() => {});
      }
    };
  }, [partyId, user, navigate]);

  const loadParticipants = useCallback(async () => {
    const { data } = await supabase
      .from("watch_party_participants")
      .select("*")
      .eq("party_id", partyId)
      .order("joined_at");
    const rows = (data ?? []) as Participant[];
    await Promise.all(rows.map(async (p) => {
      const { data: e } = await supabase.rpc("get_user_email", { _user_id: p.user_id });
      p.email = (e as string) ?? undefined;
    }));
    setParticipants(rows);
  }, [partyId]);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("watch_party_messages")
      .select("*")
      .eq("party_id", partyId)
      .order("created_at")
      .limit(200);
    const rows = (data ?? []) as ChatMsg[];
    await Promise.all(rows.map(async (m) => {
      const { data: e } = await supabase.rpc("get_user_email", { _user_id: m.user_id });
      m.email = (e as string) ?? undefined;
    }));
    setMessages(rows);
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }), 50);
  }, [partyId]);

  useEffect(() => {
    if (!partyId) return;
    loadParticipants();
    loadMessages();

    const ch = supabase
      .channel(`hangout-${partyId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "watch_parties", filter: `id=eq.${partyId}` },
        (payload) => {
          const next = payload.new as Party;
          lastRemoteUpdate.current = Date.now();
          setParty(next);
          if (next.ended_at) {
            toast.info("Host ended the party");
            setTimeout(() => navigate({ to: "/app/collaborate" }), 1500);
          }
        })
      .on("postgres_changes",
        { event: "*", schema: "public", table: "watch_party_participants", filter: `party_id=eq.${partyId}` },
        () => loadParticipants())
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "watch_party_messages", filter: `party_id=eq.${partyId}` },
        async (payload) => {
          const m = payload.new as ChatMsg;
          const { data: e } = await supabase.rpc("get_user_email", { _user_id: m.user_id });
          m.email = (e as string) ?? undefined;
          setMessages((prev) => [...prev, m]);
          setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 50);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partyId, loadParticipants, loadMessages, navigate]);

  const pushState = useCallback(async (state: { current_time_sec?: number; is_playing?: boolean }) => {
    if (!isHost) return;
    await supabase
      .from("watch_parties")
      .update({ ...state, updated_at: new Date().toISOString() })
      .eq("id", partyId);
  }, [isHost, partyId]);

  useEffect(() => {
    if (!party || isHost) return;
    const v = videoRef.current;
    if (v && party.media_kind === "video") {
      const drift = Math.abs(v.currentTime - party.current_time_sec);
      if (drift > 1.5) v.currentTime = party.current_time_sec;
      if (party.is_playing && v.paused) v.play().catch(() => {});
      if (!party.is_playing && !v.paused) v.pause();
    }
    if (ytPlayerRef.current && party.media_kind === "youtube") {
      try {
        const cur = ytPlayerRef.current.getCurrentTime?.() ?? 0;
        if (Math.abs(cur - party.current_time_sec) > 1.5) ytPlayerRef.current.seekTo(party.current_time_sec, true);
        if (party.is_playing) ytPlayerRef.current.playVideo?.();
        else ytPlayerRef.current.pauseVideo?.();
      } catch {}
    }
  }, [party, isHost]);

  useEffect(() => {
    if (!party || party.media_kind !== "youtube" || !party.media_id) return;
    let cancelled = false;
    const ensureAPI = () =>
      new Promise<any>((resolve) => {
        const w = window as any;
        if (w.YT?.Player) return resolve(w.YT);
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
        w.onYouTubeIframeAPIReady = () => resolve(w.YT);
      });
    (async () => {
      const YT = await ensureAPI();
      if (cancelled) return;
      ytPlayerRef.current = new YT.Player(`yt-${partyId}`, {
        videoId: party.media_id,
        playerVars: { playsinline: 1, modestbranding: 1, rel: 0 },
        events: {
          onReady: () => {
            try {
              ytPlayerRef.current.seekTo(party.current_time_sec, true);
              if (party.is_playing) ytPlayerRef.current.playVideo();
            } catch {}
          },
          onStateChange: (e: any) => {
            if (!isHost) return;
            const playing = e.data === YT.PlayerState.PLAYING;
            const t = ytPlayerRef.current.getCurrentTime?.() ?? 0;
            pushState({ current_time_sec: t, is_playing: playing });
          },
        },
      });
    })();
    return () => {
      cancelled = true;
      try { ytPlayerRef.current?.destroy?.(); } catch {}
      ytPlayerRef.current = null;
    };
  }, [party?.media_kind, party?.media_id, partyId, isHost]);

  useEffect(() => {
    if (!isHost || !party) return;
    const id = setInterval(() => {
      if (party.media_kind === "video" && videoRef.current) {
        pushState({ current_time_sec: videoRef.current.currentTime, is_playing: !videoRef.current.paused });
      }
      if (party.media_kind === "youtube" && ytPlayerRef.current?.getCurrentTime) {
        try {
          const t = ytPlayerRef.current.getCurrentTime();
          const state = ytPlayerRef.current.getPlayerState?.();
          pushState({ current_time_sec: t, is_playing: state === 1 });
        } catch {}
      }
    }, 8000);
    return () => clearInterval(id);
  }, [isHost, party, pushState]);

  const sendMsg = async () => {
    if (!user || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    await supabase.from("watch_party_messages").insert({
      party_id: partyId, user_id: user.id, body: text,
    });
  };

  const endParty = async () => {
    if (!isHost) return;
    await supabase.from("watch_parties").update({ ended_at: new Date().toISOString(), is_playing: false }).eq("id", partyId);
    toast.success("Party ended");
    navigate({ to: "/app/collaborate" });
  };

  const leaveParty = async () => {
    if (!user) return;
    await supabase.from("watch_party_participants").update({ left_at: new Date().toISOString() }).eq("party_id", partyId).eq("user_id", user.id);
    navigate({ to: "/app/collaborate" });
  };

  if (loading || !party) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const active = participants.filter((p) => !p.left_at);

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-background">
      <main className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 shrink-0 border-b border-border flex items-center px-4 gap-3">
          <Link to="/app/collaborate" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/30">
            <Tv className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{party.title}</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              {active.length} watching · {party.media_kind.toUpperCase()}
            </p>
          </div>
          {isHost ? (
            <Button onClick={endParty} variant="destructive" size="sm">End party</Button>
          ) : (
            <Button onClick={leaveParty} variant="outline" size="sm"><LogOut className="h-3.5 w-3.5 mr-1" />Leave</Button>
          )}
        </header>

        <div className="flex-1 min-h-0 flex items-center justify-center bg-black/60 p-3">
          <div className="w-full h-full max-w-5xl rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black grid place-items-center">
            {party.media_kind === "video" ? (
              <video
                ref={videoRef}
                src={party.media_url}
                controls={isHost}
                playsInline
                onPlay={() => pushState({ is_playing: true, current_time_sec: videoRef.current?.currentTime ?? 0 })}
                onPause={() => pushState({ is_playing: false, current_time_sec: videoRef.current?.currentTime ?? 0 })}
                onSeeked={() => pushState({ current_time_sec: videoRef.current?.currentTime ?? 0 })}
                className="w-full h-full object-contain"
              />
            ) : party.media_kind === "youtube" ? (
              <div id={`yt-${partyId}`} className="w-full h-full" />
            ) : (
              <iframe
                src={party.media_url}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                className="w-full h-full border-0"
                title={party.title}
              />
            )}
          </div>
        </div>

        {!isHost && party.media_kind !== "iframe" && (
          <div className="px-4 py-2 text-[11px] text-muted-foreground text-center border-t border-border">
            Synced with host · drift auto-corrects every few seconds
          </div>
        )}
      </main>

      <aside className="lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-background/60 backdrop-blur-xl flex flex-col max-h-[45vh] lg:max-h-none">
        <div className="p-3 border-b border-border">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" /> Watching now · {active.length}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {active.map((p) => (
              <div key={p.id} className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]",
                p.user_id === party.host_id ? "bg-pink-500/20 text-pink-200" : "bg-accent/60",
              )}>
                {p.user_id === party.host_id && <Crown className="h-3 w-3" />}
                {p.email?.split("@")[0] ?? "guest"}
              </div>
            ))}
          </div>
        </div>
        <div ref={chatRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2 text-sm">
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Say something while you watch 🎬</p>
          ) : messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={cn("flex flex-col", mine && "items-end")}>
                <span className="text-[10px] text-muted-foreground">{m.email?.split("@")[0]}</span>
                <span className={cn(
                  "inline-block max-w-[85%] rounded-xl px-2.5 py-1.5 break-words",
                  mine ? "bg-primary text-primary-foreground" : "bg-accent/60",
                )}>{m.body}</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border p-2 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMsg(); }}
            placeholder="Type a message…"
            className="flex-1 rounded-lg bg-accent/40 border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button onClick={sendMsg} size="icon" className="shrink-0 h-8 w-8"><Send className="h-3.5 w-3.5" /></Button>
        </div>
      </aside>
    </div>
  );
}
