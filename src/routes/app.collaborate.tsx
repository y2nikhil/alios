import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  MessageSquare, Send, Hash, Globe, Users, Plus, Tv, Sparkles, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { parseYouTube } from "@/lib/youtube";
import { toast } from "sonner";
import { ReportButton } from "@/components/ReportButton";

export const Route = createFileRoute("/app/collaborate")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Collaborate — ALIOS" }] }),
  component: CollaboratePage,
});

type Team = { id: string; name: string };
type Group = { id: string; slug: string; name: string; emoji: string; topic: string | null; description: string | null };
type Channel = { id: string; team_id: string | null; group_id: string | null; name: string };
type Msg = { id: string; channel_id: string; user_id: string; body: string; created_at: string; email?: string };
type Party = { id: string; host_id: string; title: string; media_kind: string; started_at: string; ended_at: string | null };

function CollaboratePage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamChannels, setTeamChannels] = useState<Channel[]>([]);
  const [globalChannels, setGlobalChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupChannels, setGroupChannels] = useState<Channel[]>([]);
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const [parties, setParties] = useState<Party[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newPartyOpen, setNewPartyOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;

    const [{ data: globals }, { data: allGroups }, { data: memberships }, { data: liveParties }] = await Promise.all([
      supabase.from("chat_channels").select("*").is("team_id", null).is("group_id", null).order("created_at"),
      supabase.from("groups").select("*").eq("is_public", true).order("name"),
      supabase.from("group_members").select("group_id").eq("user_id", user.id),
      supabase.from("watch_parties").select("id,host_id,title,media_kind,started_at,ended_at").is("ended_at", null).order("started_at", { ascending: false }),
    ]);

    setGlobalChannels((globals ?? []) as Channel[]);
    setGroups((allGroups ?? []) as Group[]);
    setParties((liveParties ?? []) as Party[]);

    const joined = new Set<string>((memberships ?? []).map((m: any) => m.group_id as string));
    setJoinedGroupIds(joined);

    if (joined.size > 0) {
      const { data: gc } = await supabase
        .from("chat_channels")
        .select("*")
        .in("group_id", Array.from(joined));
      setGroupChannels((gc ?? []) as Channel[]);
    } else {
      setGroupChannels([]);
    }

    const { data: mems } = await supabase
      .from("team_members").select("team_id").eq("user_id", user.id).eq("status", "active");
    const { data: ownerTeams } = await supabase.from("teams").select("id,name").eq("owner_id", user.id);
    const teamIds = new Set<string>();
    (mems ?? []).forEach((m: any) => teamIds.add(m.team_id));
    (ownerTeams ?? []).forEach((t: any) => teamIds.add(t.id));
    if (teamIds.size > 0) {
      const { data: ts } = await supabase.from("teams").select("id,name").in("id", Array.from(teamIds));
      setTeams((ts ?? []) as Team[]);
      const { data: cs } = await supabase.from("chat_channels").select("*").in("team_id", Array.from(teamIds)).order("created_at");
      setTeamChannels((cs ?? []) as Channel[]);
    }

    if (!activeChannel) {
      const room = (globals ?? []).find((c: any) => c.name === "chat-room") ?? (globals ?? [])[0];
      if (room) setActiveChannel(room.id);
    }
  }, [user, activeChannel]);

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user]);

  // Realtime: new parties + party endings + new groups
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("collab-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_parties" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => loadAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${user.id}` }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadAll]);

  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await supabase.from("chat_messages").select("*").eq("channel_id", cid).order("created_at").limit(200);
    const emails = new Map<string, string>();
    await Promise.all((data ?? []).map(async (m: any) => {
      if (emails.has(m.user_id)) return;
      const { data: e } = await supabase.rpc("get_user_email", { _user_id: m.user_id });
      if (e) emails.set(m.user_id, e as string);
    }));
    setMessages((data ?? []).map((m: any) => ({ ...m, email: emails.get(m.user_id) })));
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    loadMessages(activeChannel);
    const ch = supabase
      .channel(`chat-${activeChannel}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannel}` },
        async (payload) => {
          const m = payload.new as Msg;
          const { data: e } = await supabase.rpc("get_user_email", { _user_id: m.user_id });
          setMessages((prev) => [...prev, { ...m, email: (e as string) ?? undefined }]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeChannel, loadMessages]);

  const sendMsg = async () => {
    if (!user || !activeChannel || !body.trim()) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("chat_messages").insert({ channel_id: activeChannel, user_id: user.id, body: text });
    setSending(false);
    if (error) { setBody(text); toast.error("Couldn't send"); }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id });
    toast.success("Joined!");
    await loadAll();
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    await loadAll();
  };

  const allChannels = useMemo(() => [...globalChannels, ...groupChannels, ...teamChannels], [globalChannels, groupChannels, teamChannels]);
  const active = allChannels.find((c) => c.id === activeChannel);
  const activeGroup = active?.group_id ? groups.find((g) => g.id === active.group_id) : null;
  const activeTeam = active?.team_id ? teams.find((t) => t.id === active.team_id) : null;

  const joinedGroups = groups.filter((g) => joinedGroupIds.has(g.id));

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden">
      <aside className="w-64 shrink-0 border-r border-border bg-background/40 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/30">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">Collaborate</p>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Chat · Groups · Hangouts</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-4">
          {/* Live parties */}
          {parties.length > 0 && (
            <div>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                <Tv className="h-3 w-3 text-pink-400" /> Live now
              </p>
              {parties.map((p) => (
                <Link key={p.id} to="/app/hangout/$partyId" params={{ partyId: p.id }}
                  className="block rounded-lg px-2.5 py-1.5 text-sm text-foreground hover:bg-pink-500/10 border border-pink-500/20 mb-1 truncate">
                  <span className="inline-block h-2 w-2 rounded-full bg-pink-400 animate-pulse mr-2" />
                  {p.title}
                </Link>
              ))}
            </div>
          )}

          {/* Global */}
          <div>
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Everyone
            </p>
            {globalChannels.map((c) => (
              <ChannelBtn key={c.id} label={c.name} active={activeChannel === c.id} onClick={() => setActiveChannel(c.id)} />
            ))}
          </div>

          {/* My groups */}
          <div>
            <div className="flex items-center justify-between px-2 mb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" /> My groups
              </p>
              <button onClick={() => setBrowseOpen(true)} className="text-[10px] text-primary hover:underline">Browse</button>
            </div>
            {joinedGroups.length === 0 ? (
              <p className="px-2 text-[11px] text-muted-foreground/70 italic">Join a study group →</p>
            ) : joinedGroups.map((g) => {
              const c = groupChannels.find((ch) => ch.group_id === g.id);
              if (!c) return null;
              return <ChannelBtn key={c.id} label={`${g.emoji} ${g.name}`} active={activeChannel === c.id} onClick={() => setActiveChannel(c.id)} />;
            })}
          </div>

          {/* Teams */}
          {teams.map((t) => (
            <div key={t.id}>
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t.name}</p>
              {teamChannels.filter((c) => c.team_id === t.id).map((c) => (
                <ChannelBtn key={c.id} label={c.name} active={activeChannel === c.id} onClick={() => setActiveChannel(c.id)} />
              ))}
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-border space-y-1.5">
          <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={() => setNewPartyOpen(true)}>
            <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Start watch party
          </Button>
          <Button size="sm" variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => setNewGroupOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New group
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        {active ? (
          <>
            <header className="h-14 border-b border-border flex items-center px-4 gap-2 shrink-0">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold truncate">
                {activeGroup ? `${activeGroup.emoji} ${activeGroup.name}` : active.name}
              </p>
              <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                · {activeGroup ? activeGroup.topic ?? "Group" : activeTeam ? activeTeam.name : "Open to everyone"}
              </span>
              <div className="ml-auto">
                <Button size="sm" onClick={() => setNewPartyOpen(true)}
                  className="gap-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90 text-white shadow-lg shadow-pink-500/20">
                  <Tv className="h-3.5 w-3.5" /> Watch party
                </Button>
              </div>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No messages yet — say hi 👋</p>
                </div>
              ) : messages.map((m, idx) => {
                const prev = messages[idx - 1];
                const showMeta = !prev || prev.user_id !== m.user_id ||
                  new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
                const mine = m.user_id === user?.id;
                return (
                  <div key={m.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                    {showMeta ? (
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                        mine ? "bg-gradient-to-br from-violet-500 to-cyan-400" : "bg-gradient-to-br from-emerald-500 to-teal-400")}>
                        {(m.email?.[0] ?? "?").toUpperCase()}
                      </div>
                    ) : <div className="w-8 shrink-0" />}
                    <div className={cn("min-w-0 flex-1", mine && "flex flex-col items-end")}>
                      {showMeta && (
                        <div className={cn("flex items-baseline gap-2 mb-0.5", mine && "flex-row-reverse")}>
                          <p className="text-xs font-semibold">{m.email ?? "User"}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      )}
                      <div className={cn("group inline-flex items-start gap-1.5 max-w-[75%]", mine && "flex-row-reverse")}>
                        <div className={cn("inline-block rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                          mine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-accent/60 rounded-tl-sm")}>
                          {m.body}
                        </div>
                        {!mine && (
                          <div className="opacity-0 group-hover:opacity-100 transition self-center">
                            <ReportButton targetType="chat_message" targetId={m.id} targetUserId={m.user_id} size="xs" label="" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <textarea
                value={body} onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
                placeholder={`Message #${active.name}`} rows={1}
                className="flex-1 resize-none rounded-xl bg-accent/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
              />
              <Button onClick={sendMsg} disabled={sending || !body.trim()} size="icon" className="shrink-0"><Send className="h-4 w-4" /></Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </main>

      {/* Browse groups */}
      <Dialog open={browseOpen} onOpenChange={setBrowseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Browse study groups</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {groups.map((g) => {
              const joined = joinedGroupIds.has(g.id);
              return (
                <div key={g.id} className="rounded-xl border border-border p-3 bg-accent/30">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xl">{g.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm">{g.name}</p>
                      <p className="text-[10px] text-muted-foreground">{g.topic}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{g.description}</p>
                  {joined ? (
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => leaveGroup(g.id)}>Leave</Button>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => joinGroup(g.id)}>Join</Button>
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <NewGroupDialog open={newGroupOpen} onOpenChange={setNewGroupOpen} onCreated={loadAll} userId={user?.id} />
      <NewPartyDialog open={newPartyOpen} onOpenChange={setNewPartyOpen} userId={user?.id} />
    </div>
  );
}

function ChannelBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors truncate",
      active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
    )}>
      <Hash className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function NewGroupDialog({ open, onOpenChange, onCreated, userId }:
  { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void; userId?: string }) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!userId || !name.trim()) return;
    setBusy(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) + "-" + Math.random().toString(36).slice(2, 6);
    const { error } = await supabase.from("groups").insert({
      name: name.trim(), slug, topic: topic.trim() || null, description: description.trim() || null,
      emoji: emoji || "💬", is_public: true, created_by: userId,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Group created");
    setName(""); setTopic(""); setDescription(""); setEmoji("💬");
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create a study group</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} className="w-16 text-center text-xl" />
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name (e.g. JEE Mains Crew)" />
          </div>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (Exam, Hangout, Project…)" />
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this group about?" rows={3} />
          <p className="text-[11px] text-muted-foreground">Anyone signed in can find and join your group.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>{busy ? "Creating…" : "Create group"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewPartyDialog({ open, onOpenChange, userId }:
  { open: boolean; onOpenChange: (v: boolean) => void; userId?: string }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const PRESETS: { label: string; emoji: string; hint: string; sample: string; titleHint: string }[] = [
    { label: "YouTube",   emoji: "▶️", hint: "Paste any YouTube link",        sample: "https://youtu.be/",                titleHint: "Watch on YouTube" },
    { label: "Movie / .mp4", emoji: "🎬", hint: "Direct .mp4 / .m3u8 stream",  sample: "https://example.com/movie.mp4",    titleHint: "Movie Night 🍿" },
    { label: "Twitch",    emoji: "🎮", hint: "Embed a live Twitch stream",    sample: "https://player.twitch.tv/?channel=",titleHint: "Twitch Watch-along" },
    { label: "Vimeo",     emoji: "🎞️", hint: "Paste a Vimeo URL",              sample: "https://vimeo.com/",                titleHint: "Vimeo Screening" },
    { label: "Any site",  emoji: "🌐", hint: "Iframe any embeddable page",    sample: "https://",                          titleHint: "Watch together" },
    { label: "Just chat", emoji: "💬", hint: "No media — pure hangout room",  sample: "about:blank",                       titleHint: "Hangout Room" },
  ];

  const usePreset = (p: typeof PRESETS[number]) => {
    setUrl(p.sample);
    if (!title.trim()) setTitle(p.titleHint);
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { setUrl(t); toast.success("Pasted"); }
    } catch { toast.error("Clipboard blocked — paste manually"); }
  };

  const submit = async () => {
    if (!userId || !url.trim()) return;
    setBusy(true);
    const link = url.trim();
    const yt = parseYouTube(link);
    let media_kind = "iframe";
    let media_id: string | null = null;
    if (yt && yt.kind === "video") { media_kind = "youtube"; media_id = yt.id; }
    else if (/\.(mp4|webm|m3u8|mov|mkv)(\?|$)/i.test(link)) media_kind = "video";
    else if (link === "about:blank") media_kind = "chat";

    const { data, error } = await supabase.from("watch_parties").insert({
      host_id: userId, title: title.trim() || "Untitled hangout",
      media_url: link, media_kind, media_id,
    }).select("id").single();
    setBusy(false);
    if (error || !data) { toast.error(error?.message ?? "Failed to start"); return; }
    onOpenChange(false);
    window.location.href = `/app/hangout/${data.id}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-pink-400" /> Start a watch party
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Pick a source</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button key={p.label} onClick={() => usePreset(p)}
                  className="rounded-xl border border-border bg-accent/30 hover:bg-accent hover:border-pink-500/40 transition p-2.5 text-left">
                  <div className="text-lg leading-none mb-1">{p.emoji}</div>
                  <div className="text-xs font-semibold">{p.label}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2">{p.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Party title (e.g. Friday Movie Night)" />

          <div className="flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste any video / movie / stream link" />
            <Button type="button" variant="outline" size="sm" onClick={pasteFromClipboard}>Paste</Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            YouTube & direct video (.mp4 / .m3u8) sync playback for everyone. Other links embed as a shared frame. Anyone with the link can join.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy || !url.trim()} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90">
            {busy ? "Starting…" : "🎉 Go live"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

