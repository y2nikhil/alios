import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Send, Users, Tv, LogOut, Crown, Loader2, ArrowLeft,
  Maximize2, Minimize2, MessageSquare, MessageSquareOff, PanelRightClose, PanelRightOpen,
  Play, Pause, Volume2, VolumeX, Link2, RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { parseYouTube, ytEmbedUrl } from "@/lib/youtube";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/hangout/$partyId")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Hangout — ClassLab" },
      { name: "description", content: "Watch and study together in a live ClassLab watch party." },
    ],
    links: [
      { rel: "preconnect", href: "https://www.youtube-nocookie.com" },
      { rel: "preconnect", href: "https://www.youtube.com" },
      { rel: "preconnect", href: "https://i.ytimg.com" },
      { rel: "preconnect", href: "https://rr1---sn-npoeenl6.googlevideo.com", crossOrigin: "anonymous" },
    ],
  }),
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
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [chatOnly, setChatOnly] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const lastRemoteUpdate = useRef<number>(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [curTime, setCurTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  const toggleFullscreen = async () => {
    const el = rootRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) { await el.requestFullscreen(); setIsFull(true); }
      else { await document.exitFullscreen(); setIsFull(false); }
    } catch {}
  };
  useEffect(() => {
    const h = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const isHost = !!user && !!party && user.id === party.host_id;

  // Tick current time + duration from active player
  useEffect(() => {
    if (!party) return;
    const id = setInterval(() => {
      if (scrubbing) return;
      if (party.media_kind === "video" && videoRef.current) {
        const v = videoRef.current;
        if (isFinite(v.duration)) setDuration(v.duration);
        setCurTime(v.currentTime);
        try { if (v.currentTime > 1) sessionStorage.setItem(`wp-pos-${partyId}`, JSON.stringify({ t: v.currentTime, at: Date.now() })); } catch {}
      } else if (party.media_kind === "youtube" && ytPlayerRef.current?.getCurrentTime) {
        try {
          const d = ytPlayerRef.current.getDuration?.() ?? 0;
          if (d) setDuration(d);
          const t = ytPlayerRef.current.getCurrentTime();
          setCurTime(t);
          if (t > 1) sessionStorage.setItem(`wp-pos-${partyId}`, JSON.stringify({ t, at: Date.now() }));
        } catch {}
      }
    }, 500);
    return () => clearInterval(id);
  }, [party, scrubbing]);

  // Apply volume/mute locally
  useEffect(() => {
    const vol = muted ? 0 : volume / 100;
    if (videoRef.current) { videoRef.current.volume = vol; videoRef.current.muted = muted; }
    try {
      ytPlayerRef.current?.setVolume?.(muted ? 0 : volume);
      if (muted) ytPlayerRef.current?.mute?.(); else ytPlayerRef.current?.unMute?.();
    } catch {}
  }, [volume, muted, party?.media_kind]);

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const seekTo = (t: number) => {
    if (!party) return;
    if (party.media_kind === "video" && videoRef.current) videoRef.current.currentTime = t;
    if (party.media_kind === "youtube") { try { ytPlayerRef.current?.seekTo?.(t, true); } catch {} }
    setCurTime(t);
    if (isHost) pushState({ current_time_sec: t });
  };

  const togglePlay = () => {
    if (!party) return;
    const next = !party.is_playing;
    if (party.media_kind === "video" && videoRef.current) {
      if (next) videoRef.current.play().catch(() => {}); else videoRef.current.pause();
    }
    if (party.media_kind === "youtube") {
      try { if (next) ytPlayerRef.current?.playVideo?.(); else ytPlayerRef.current?.pauseVideo?.(); } catch {}
    }
    if (isHost) pushState({ is_playing: next });
  };


  const loadParty = useCallback(async () => {
    if (!user) return;
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
  }, [partyId, user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadParty();
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
  }, [partyId, user, loadParty]);

  const loadParticipants = useCallback(async () => {
    const { data, error } = await supabase
      .from("watch_party_participants")
      .select("*")
      .eq("party_id", partyId)
      .order("joined_at");
    if (error) {
      toast.error("Could not load room members");
      return;
    }
    const rows = (data ?? []) as Participant[];
    await Promise.all(rows.map(async (p) => {
      const { data: e } = await supabase.rpc("get_user_email", { _user_id: p.user_id });
      p.email = (e as string) ?? undefined;
    }));
    setParticipants(rows);
  }, [partyId]);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("watch_party_messages")
      .select("*")
      .eq("party_id", partyId)
      .order("created_at")
      .limit(200);
    if (error) {
      toast.error("Could not load watch-party chat");
      return;
    }
    const rows = (data ?? []) as ChatMsg[];
    await Promise.all(rows.map(async (m) => {
      const { data: e } = await supabase.rpc("get_user_email", { _user_id: m.user_id });
      m.email = (e as string) ?? undefined;
    }));
    setMessages(rows);
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }), 50);
  }, [partyId]);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const subscribe = useCallback(() => {
    if (!partyId) return;
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null; }
    const ch = supabase
      .channel(`hangout-${partyId}-${Date.now()}`)
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
          setMessages((prev) => prev.some((item) => item.id === m.id) ? prev : [...prev, m]);
          setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 50);
        })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") toast.error("Watch party connection error. Try the reload button.");
      });
    channelRef.current = ch;
  }, [partyId, loadParticipants, loadMessages, navigate]);

  useEffect(() => {
    if (!partyId) return;
    loadParticipants();
    loadMessages();
    subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [partyId, loadParticipants, loadMessages, subscribe]);

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

  // Keep latest values in refs so the player is NEVER rebuilt (rebuilding restarts the video)
  const isHostRef = useRef(false);
  const pushStateRef = useRef<typeof pushState | null>(null);
  const partyRef = useRef<Party | null>(null);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { pushStateRef.current = pushState; }, [pushState]);
  useEffect(() => { partyRef.current = party; }, [party]);

  const posKey = `wp-pos-${partyId}`;
  const savePos = useCallback((t: number) => {
    try { if (t > 1) sessionStorage.setItem(posKey, JSON.stringify({ t, at: Date.now() })); } catch {}
  }, [posKey]);
  const savedPos = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(posKey);
      if (!raw) return 0;
      const { t, at } = JSON.parse(raw);
      if (Date.now() - at > 6 * 60 * 60 * 1000) return 0;
      return Number(t) || 0;
    } catch { return 0; }
  }, [posKey]);

  const mediaKind = party?.media_kind;
  const mediaId = party?.media_id;

  useEffect(() => {
    if (mediaKind !== "youtube" || !mediaId) return;
    let cancelled = false;
    const ensureAPI = () =>
      new Promise<any>((resolve) => {
        const w = window as any;
        if (w.YT?.Player) return resolve(w.YT);
        const existing = document.getElementById("yt-iframe-api");
        if (!existing) {
          const tag = document.createElement("script");
          tag.id = "yt-iframe-api";
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
        const prev = w.onYouTubeIframeAPIReady;
        w.onYouTubeIframeAPIReady = () => { prev?.(); resolve(w.YT); };
        const poll = setInterval(() => { if (w.YT?.Player) { clearInterval(poll); resolve(w.YT); } }, 120);
        setTimeout(() => clearInterval(poll), 15000);
      });
    (async () => {
      const YT = await ensureAPI();
      if (cancelled) return;
      ytPlayerRef.current = new YT.Player(`yt-${partyId}`, {
        videoId: mediaId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          playsinline: 1, modestbranding: 1, rel: 0, iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            try {
              const p = partyRef.current;
              const resume = isHostRef.current
                ? Math.max(savedPos(), p?.current_time_sec ?? 0)
                : (p?.current_time_sec ?? 0);
              if (resume > 1) ytPlayerRef.current.seekTo(resume, true);
              setDuration(ytPlayerRef.current.getDuration?.() ?? 0);
              if (p?.is_playing) ytPlayerRef.current.playVideo();
            } catch {}
          },
          onStateChange: (e: any) => {
            try {
              const t = ytPlayerRef.current?.getCurrentTime?.() ?? 0;
              savePos(t);
              const d = ytPlayerRef.current?.getDuration?.() ?? 0;
              if (d) setDuration(d);
            } catch {}
            if (!isHostRef.current) return;
            if (e.data !== YT.PlayerState.PLAYING && e.data !== YT.PlayerState.PAUSED) return;
            const playing = e.data === YT.PlayerState.PLAYING;
            const t = ytPlayerRef.current?.getCurrentTime?.() ?? 0;
            pushStateRef.current?.({ current_time_sec: t, is_playing: playing });
          },
        },
      });
    })();
    return () => {
      cancelled = true;
      try { savePos(ytPlayerRef.current?.getCurrentTime?.() ?? 0); } catch {}
      try { ytPlayerRef.current?.destroy?.(); } catch {}
      ytPlayerRef.current = null;
    };
  }, [mediaKind, mediaId, partyId, savePos, savedPos]);

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
    if (!user || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    const { data, error } = await supabase
      .from("watch_party_messages")
      .insert({ party_id: partyId, user_id: user.id, body: text })
      .select("id, party_id, user_id, body, created_at")
      .single();
    if (error) {
      setDraft(text);
      toast.error(error.message || "Could not send message");
      setSending(false);
      return;
    }
    const sent = data as ChatMsg;
    sent.email = user.email ?? undefined;
    setMessages((prev) => prev.some((item) => item.id === sent.id) ? prev : [...prev, sent]);
    setSending(false);
    requestAnimationFrame(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }));
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

  const handleReload = async () => {
    setRefreshing(true);
    toast.info("Reconnecting watch party…");
    try {
      await loadParty();
      await Promise.all([loadParticipants(), loadMessages()]);
      subscribe();
      setReloadTick((t) => t + 1);
      toast.success("Reconnected");
    } catch {
      toast.error("Soft reconnect failed — reloading page");
      window.location.reload();
    } finally {
      setTimeout(() => setRefreshing(false), 800);
    }
  };

  if (loading || !party) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <Button onClick={handleReload} disabled={refreshing} variant="outline" size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin")} /> Reload
          </Button>
        </div>
      </div>
    );
  }

  const active = participants.filter((p) => !p.left_at);

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex flex-col md:flex-row bg-background overflow-hidden",
        isFull ? "h-screen" : "h-full min-h-0",
      )}
    >
      {!chatOnly && (
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
            <Button
              onClick={async () => {
                const url = `${window.location.origin}/app/hangout/${party.id}`;
                try { await navigator.clipboard.writeText(url); toast.success("Invite link copied"); }
                catch { toast.error("Copy failed"); }
              }}
              variant="ghost"
              size="sm"
              title="Copy invite link"
            >
              <Link2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              onClick={handleReload}
              disabled={refreshing}
              variant="ghost"
              size="sm"
              title="Reload player & reconnect"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            </Button>
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              title={isFull ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
            <Button
              onClick={() => setShowChat((v) => !v)}
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex"
              title={showChat ? "Hide chat" : "Show chat"}
            >
              {showChat ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
            </Button>
            <Button
              onClick={() => setChatOnly(true)}
              variant="ghost"
              size="sm"
              title="Chat-only mode"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            {isHost ? (
              <Button onClick={endParty} variant="destructive" size="sm">End party</Button>
            ) : (
              <Button onClick={leaveParty} variant="outline" size="sm"><LogOut className="h-3.5 w-3.5 mr-1" />Leave</Button>
            )}
          </header>

          <div className="flex-1 min-h-0 flex items-center justify-center bg-black/80 p-2 sm:p-3">
            <div className={cn(
              "w-full h-full overflow-hidden border border-white/10 shadow-2xl bg-black grid place-items-center",
              isFull ? "max-w-none rounded-none" : "max-w-6xl rounded-xl",
            )}>
              {party.media_kind === "video" ? (
                <video
                  ref={videoRef}
                  src={party.media_url}
                  controls={isHost}
                  playsInline
                  preload="auto"
                  onLoadedMetadata={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    setDuration(isFinite(v.duration) ? v.duration : 0);
                    const resume = isHost ? Math.max(savedPos(), party.current_time_sec) : party.current_time_sec;
                    if (resume > 1 && Math.abs(v.currentTime - resume) > 1) v.currentTime = resume;
                    if (party.is_playing) v.play().catch(() => {});
                  }}
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

          {(party.media_kind === "video" || party.media_kind === "youtube") && (
            <div className="shrink-0 border-t border-border bg-background/70 backdrop-blur-xl px-3 sm:px-4 py-2.5 flex items-center gap-3">
              <Button
                onClick={togglePlay}
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0 rounded-full bg-white/5 hover:bg-white/10"
                disabled={!isHost}
                title={isHost ? (party.is_playing ? "Pause" : "Play") : "Only the host controls playback"}
              >
                {party.is_playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <span className="text-[11px] tabular-nums text-muted-foreground w-10 text-right">{fmtTime(curTime)}</span>
              <Slider
                value={[Math.min(curTime, duration || 0)]}
                max={Math.max(duration, 1)}
                step={0.5}
                disabled={!duration}
                onValueChange={(v) => { setScrubbing(true); setCurTime(v[0]); }}
                onValueCommit={(v) => { setScrubbing(false); seekTo(v[0]); }}
                className="flex-1"
              />
              <span className="text-[11px] tabular-nums text-muted-foreground w-10">{fmtTime(duration)}</span>
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-white/10 w-40">
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/5 transition text-muted-foreground hover:text-foreground"
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <Slider
                  value={[muted ? 0 : volume]}
                  max={100}
                  step={1}
                  onValueChange={(v) => { setVolume(v[0]); if (v[0] > 0) setMuted(false); }}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </main>

      )}

      {(showChat || chatOnly) && (
        <aside className={cn(
          "shrink-0 border-t md:border-t-0 md:border-l border-border bg-background/70 backdrop-blur-xl flex flex-col",
          chatOnly ? "flex-1 w-full max-h-none" : "md:w-80 md:h-full min-h-0 max-h-[45vh] md:max-h-none",
        )}>
          <div className="p-3 border-b border-border flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 flex-1">
              <Users className="h-3 w-3" /> Watching now · {active.length}
            </p>
            {chatOnly && (
              <Button onClick={() => setChatOnly(false)} variant="ghost" size="sm" title="Show video">
                <MessageSquareOff className="h-3.5 w-3.5 mr-1" /> Exit chat-only
              </Button>
            )}
            <Button onClick={toggleFullscreen} variant="ghost" size="sm">
              {isFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <div className="p-2 border-b border-border flex flex-wrap gap-1.5">
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
          <div ref={chatRef} className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2 text-sm">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Say something while you watch 🎬</p>
            ) : messages.map((m) => {
              const mine = m.user_id === user?.id;
              return (
                <div key={m.id} className={cn("flex flex-col glide-in", mine && "items-end")}>
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder="Type a message…"
              disabled={sending}
              className="flex-1 rounded-lg bg-accent/40 border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button onClick={sendMsg} size="icon" disabled={sending || !draft.trim()} className="shrink-0 h-8 w-8">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </aside>
      )}

      {!chatOnly && !showChat && (
        <button
          onClick={() => setShowChat(true)}
          className="hidden lg:flex fixed bottom-6 right-6 z-30 h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 hover:scale-105 transition"
          aria-label="Open chat"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

