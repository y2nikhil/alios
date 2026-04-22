import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { MessageSquare, Send, Hash, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/collaborate")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Collaborate — ALIOS" }] }),
  component: CollaboratePage,
});

type Team = { id: string; name: string };
type Channel = { id: string; team_id: string; name: string };
type Msg = {
  id: string;
  channel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  email?: string;
};

function CollaboratePage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load all teams I belong to + their channels
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mems } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      const { data: ownerTeams } = await supabase
        .from("teams")
        .select("id,name")
        .eq("owner_id", user.id);
      const teamIds = new Set<string>();
      (mems ?? []).forEach((m) => teamIds.add(m.team_id));
      (ownerTeams ?? []).forEach((t) => teamIds.add(t.id));
      if (teamIds.size === 0) {
        setTeams([]);
        setChannels([]);
        return;
      }
      const { data: ts } = await supabase
        .from("teams")
        .select("id,name")
        .in("id", Array.from(teamIds));
      setTeams((ts ?? []) as Team[]);
      const { data: cs } = await supabase
        .from("chat_channels")
        .select("*")
        .in("team_id", Array.from(teamIds))
        .order("created_at");
      setChannels((cs ?? []) as Channel[]);
      if (cs && cs.length > 0 && !activeChannel) setActiveChannel(cs[0].id);
    })();
  }, [user]); // eslint-disable-line

  const loadMessages = useCallback(async (cid: string) => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", cid)
      .order("created_at", { ascending: true })
      .limit(200);
    const userIds = Array.from(new Set((data ?? []).map((m) => m.user_id)));
    const emails = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: e } = await supabase.rpc("get_user_email", { _user_id: uid });
        if (e) emails.set(uid, e as string);
      }),
    );
    setMessages(
      (data ?? []).map((m) => ({ ...m, email: emails.get(m.user_id) })) as Msg[],
    );
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50);
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    loadMessages(activeChannel);
    const ch = supabase
      .channel(`chat-${activeChannel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${activeChannel}` },
        async (payload) => {
          const m = payload.new as Msg;
          const { data: e } = await supabase.rpc("get_user_email", { _user_id: m.user_id });
          setMessages((prev) => [...prev, { ...m, email: (e as string) ?? undefined }]);
          setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeChannel, loadMessages]);

  const sendMsg = async () => {
    if (!user || !activeChannel || !body.trim()) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("chat_messages").insert({
      channel_id: activeChannel,
      user_id: user.id,
      body: text,
    });
    setSending(false);
    if (error) {
      setBody(text);
      return;
    }
    // Mention notifications: parse @email
    const mentions = text.match(/@([\w.+-]+@[\w-]+\.[\w.-]+)/g);
    if (mentions) {
      for (const m of mentions) {
        const email = m.slice(1);
        const { data: uid } = await supabase.rpc("find_user_by_email", { _email: email });
        if (uid) {
          await supabase.rpc("notify_user", {
            _user_id: uid as string,
            _type: "chat_mention",
            _title: "You were mentioned",
            _body: text.slice(0, 140),
            _link: "/app/collaborate",
          });
        }
      }
    }
  };

  const channelsByTeam = teams.map((t) => ({
    team: t,
    channels: channels.filter((c) => c.team_id === t.id),
  }));

  const active = channels.find((c) => c.id === activeChannel);
  const activeTeam = active ? teams.find((t) => t.id === active.team_id) : null;

  return (
    <div className="h-[calc(100vh-3.5rem)] lg:h-screen flex">
      {/* Sidebar: teams & channels */}
      <aside className="w-64 shrink-0 border-r border-border bg-background/40 backdrop-blur-xl flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-lg shadow-emerald-500/30">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold">Collaborate</p>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Team chat</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-3">
          {channelsByTeam.length === 0 ? (
            <div className="p-4 text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground mt-2">
                Join a team to start chatting.
              </p>
            </div>
          ) : (
            channelsByTeam.map(({ team, channels: cs }) => (
              <div key={team.id}>
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {team.name}
                </p>
                {cs.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChannel(c.id)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                      activeChannel === c.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/30",
                    )}
                  >
                    <Hash className="h-3.5 w-3.5" />
                    {c.name}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main: chat */}
      <main className="flex-1 flex flex-col min-w-0">
        {active ? (
          <>
            <header className="h-14 border-b border-border flex items-center px-4 gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{active.name}</p>
              <span className="text-xs text-muted-foreground">· {activeTeam?.name}</span>
            </header>
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No messages yet — say hi 👋</p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const prev = messages[idx - 1];
                  const showMeta = !prev || prev.user_id !== m.user_id ||
                    new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;
                  const mine = m.user_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                      {showMeta && (
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                          mine
                            ? "bg-gradient-to-br from-violet-500 to-cyan-400"
                            : "bg-gradient-to-br from-emerald-500 to-teal-400",
                        )}>
                          {(m.email?.[0] ?? "?").toUpperCase()}
                        </div>
                      )}
                      {!showMeta && <div className="w-8 shrink-0" />}
                      <div className={cn("min-w-0 flex-1", mine && "flex flex-col items-end")}>
                        {showMeta && (
                          <div className={cn("flex items-baseline gap-2 mb-0.5", mine && "flex-row-reverse")}>
                            <p className="text-xs font-semibold">{m.email ?? "User"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                            </p>
                          </div>
                        )}
                        <div className={cn(
                          "inline-block max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                          mine
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-accent/60 rounded-tl-sm",
                        )}>
                          {m.body}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-border p-3 flex gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMsg();
                  }
                }}
                placeholder={`Message #${active.name} — use @email to mention`}
                rows={1}
                className="flex-1 resize-none rounded-xl bg-accent/40 border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary max-h-32"
              />
              <Button onClick={sendMsg} disabled={sending || !body.trim()} size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {teams.length === 0
                  ? "You're not part of any teams yet."
                  : "Pick a channel to start chatting."}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
