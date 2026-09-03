import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye, Users, Activity as ActivityIcon, MessageSquare, Tv, RefreshCw, Search, Clock, MousePointerClick, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";

export const Route = createFileRoute("/app/overwatch")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", session.user.id);
    if (!roles?.some((r) => r.role === "super_admin")) throw redirect({ to: "/app" });
  },
  head: () => ({
    meta: [
      { title: "Overwatch — Super Admin Control Room | ClassLab" },
      { name: "description", content: "Full-visibility super admin console: presence, AUX activity, in-app behaviour and every message across ClassLab." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Overwatch,
});

type Profile = {
  id: string; display_name: string | null; username: string | null;
  last_seen_at: string | null; created_at: string;
};
type AuxSession = {
  id: string; user_id: string; status_id: string; started_at: string;
  ended_at: string | null; duration_seconds: number | null; note: string | null;
};
type AuxStatus = { id: string; user_id: string; name: string; color: string; category: string };
type ActEvent = {
  id: string; user_id: string; kind: string; path: string | null; label: string | null;
  metadata: Record<string, unknown>; created_at: string;
};
type Msg = {
  id: string; user_id: string; body: string | null; created_at: string;
  source: "Chat" | "Watch party" | "Comment" | "Post"; where: string;
};

const rel = (iso?: string | null) => {
  if (!iso) return "never";
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
const isOnline = (iso?: string | null) =>
  !!iso && Date.now() - new Date(iso).getTime() < 3 * 60 * 1000;

function Overwatch() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sessions, setSessions] = useState<AuxSession[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AuxStatus>>({});
  const [events, setEvents] = useState<ActEvent[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [focusUser, setFocusUser] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 90 * 86400_000).toISOString();
    const [p, s, st, cm, wm, pc, po] = await Promise.all([
      supabase.from("profiles").select("id,display_name,username,last_seen_at,created_at").order("last_seen_at", { ascending: false, nullsFirst: false }).limit(2000),
      supabase.from("aux_sessions").select("id,user_id,status_id,started_at,ended_at,duration_seconds,note").gte("started_at", since).order("started_at", { ascending: false }).limit(5000),
      supabase.from("aux_statuses").select("id,user_id,name,color,category").limit(5000),

      supabase.from("chat_messages").select("id,user_id,body,created_at,channel_id").order("created_at", { ascending: false }).limit(1000),
      supabase.from("watch_party_messages").select("id,user_id,body,created_at,party_id").order("created_at", { ascending: false }).limit(1000),
      supabase.from("post_comments").select("id,author_id,body,created_at,post_id").order("created_at", { ascending: false }).limit(1000),
      supabase.from("posts").select("id,author_id,title,body,created_at").order("created_at", { ascending: false }).limit(1000),
    ]);

    setProfiles((p.data as Profile[]) ?? []);
    setSessions((s.data as AuxSession[]) ?? []);
    const map: Record<string, AuxStatus> = {};
    ((st.data as AuxStatus[]) ?? []).forEach((x) => { map[x.id] = x; });
    setStatuses(map);
    setEvents((ev.data as ActEvent[]) ?? []);

    const all: Msg[] = [
      ...((cm.data as any[]) ?? []).map((m) => ({ id: m.id, user_id: m.user_id, body: m.body, created_at: m.created_at, source: "Chat" as const, where: m.channel_id })),
      ...((wm.data as any[]) ?? []).map((m) => ({ id: m.id, user_id: m.user_id, body: m.body, created_at: m.created_at, source: "Watch party" as const, where: m.party_id })),
      ...((pc.data as any[]) ?? []).map((m) => ({ id: m.id, user_id: m.author_id, body: m.body, created_at: m.created_at, source: "Comment" as const, where: m.post_id })),
      ...((po.data as any[]) ?? []).map((m) => ({ id: m.id, user_id: m.author_id, body: `${m.title}${m.body ? " — " + m.body : ""}`, created_at: m.created_at, source: "Post" as const, where: m.id })),
    ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    setMessages(all);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const nameOf = useCallback((id: string) => {
    const p = profiles.find((x) => x.id === id);
    return p?.display_name || p?.username || id.slice(0, 8);
  }, [profiles]);

  const activeSessionByUser = useMemo(() => {
    const m: Record<string, AuxSession> = {};
    sessions.forEach((s) => { if (!s.ended_at && !m[s.user_id]) m[s.user_id] = s; });
    return m;
  }, [sessions]);

  const todayByUser = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const m: Record<string, number> = {};
    sessions.forEach((s) => {
      if (new Date(s.started_at) < start) return;
      const secs = s.duration_seconds ?? Math.floor((Date.now() - +new Date(s.started_at)) / 1000);
      m[s.user_id] = (m[s.user_id] ?? 0) + secs;
    });
    return m;
  }, [sessions]);

  const filteredProfiles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return profiles.filter((p) =>
      !t || (p.display_name ?? "").toLowerCase().includes(t) || (p.username ?? "").toLowerCase().includes(t));
  }, [profiles, q]);

  const uf = <T extends { user_id: string }>(rows: T[]) =>
    focusUser ? rows.filter((r) => r.user_id === focusUser) : rows;

  const onlineCount = profiles.filter((p) => isOnline(p.last_seen_at)).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> Overwatch
          </h1>
          <p className="text-sm text-muted-foreground">
            Full super-admin visibility — presence, AUX, in-app behaviour and every message.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} /> Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Members", value: profiles.length, icon: Users },
          { label: "Online now", value: onlineCount, icon: ActivityIcon },
          { label: "Active AUX", value: Object.keys(activeSessionByUser).length, icon: Clock },
          { label: "Events (recent)", value: events.length, icon: MousePointerClick },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…" className="pl-9" />
        </div>
        {focusUser && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setFocusUser(null)}>
            Focused: {nameOf(focusUser)} ✕
          </Badge>
        )}
      </div>

      <Tabs defaultValue="people">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="people"><Users className="h-4 w-4 mr-1.5" />People</TabsTrigger>
          <TabsTrigger value="aux"><Clock className="h-4 w-4 mr-1.5" />AUX sessions</TabsTrigger>
          <TabsTrigger value="activity"><MousePointerClick className="h-4 w-4 mr-1.5" />In-app activity</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="h-4 w-4 mr-1.5" />Messages</TabsTrigger>
        </TabsList>

        {/* PEOPLE */}
        <TabsContent value="people" className="mt-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-[1.4fr_1fr_1fr_.8fr] gap-2 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground bg-muted/40">
              <span>Member</span><span>Last seen</span><span>Current AUX</span><span>Today</span>
            </div>
            <ScrollArea className="h-[520px]">
              {filteredProfiles.map((p) => {
                const act = activeSessionByUser[p.id];
                const st = act ? statuses[act.status_id] : null;
                return (
                  <button
                    key={p.id}
                    onClick={() => setFocusUser(p.id)}
                    className="w-full text-left grid grid-cols-[1.4fr_1fr_1fr_.8fr] gap-2 px-4 py-3 border-t border-border hover:bg-muted/40 items-center"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", isOnline(p.last_seen_at) ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                      <span className="truncate">
                        <span className="font-medium">{p.display_name || "Unnamed"}</span>
                        {p.username && <span className="text-muted-foreground text-xs"> @{p.username}</span>}
                      </span>
                    </span>
                    <span className="text-sm text-muted-foreground">{rel(p.last_seen_at)}</span>
                    <span className="text-sm">
                      {st ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: st.color }} />
                          {st.name}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </span>
                    <span className="text-sm tabular-nums">{formatDuration(todayByUser[p.id] ?? 0)}</span>
                  </button>
                );
              })}
              {!filteredProfiles.length && <p className="p-6 text-sm text-muted-foreground">No members found.</p>}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* AUX */}
        <TabsContent value="aux" className="mt-4">
          <ScrollArea className="h-[600px] rounded-xl border border-border">
            {uf(sessions).map((s) => {
              const st = statuses[s.status_id];
              const secs = s.duration_seconds ?? Math.floor((Date.now() - +new Date(s.started_at)) / 1000);
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 border-b border-border last:border-0">
                  <span className="h-2 w-2 rounded-full" style={{ background: st?.color ?? "#888" }} />
                  <span className="font-medium">{nameOf(s.user_id)}</span>
                  <Badge variant="outline">{st?.name ?? "Unknown AUX"}</Badge>
                  {st && <span className="text-xs text-muted-foreground">{st.category}</span>}
                  <span className="text-sm tabular-nums">{formatDuration(secs)}</span>
                  {!s.ended_at && <Badge className="bg-emerald-600 text-white">live</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(s.started_at).toLocaleString()}
                  </span>
                  {s.note && <span className="w-full text-xs text-muted-foreground">“{s.note}”</span>}
                </div>
              );
            })}
            {!uf(sessions).length && <p className="p-6 text-sm text-muted-foreground">No AUX sessions in the last 90 days.</p>}
          </ScrollArea>
        </TabsContent>

        {/* ACTIVITY */}
        <TabsContent value="activity" className="mt-4">
          <ScrollArea className="h-[600px] rounded-xl border border-border">
            {uf(events).map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 border-b border-border last:border-0 text-sm">
                <Badge variant={e.kind === "click" ? "secondary" : "outline"} className="capitalize">
                  {e.kind === "click" ? <MousePointerClick className="h-3 w-3 mr-1" /> : <FileText className="h-3 w-3 mr-1" />}
                  {e.kind.replace("_", " ")}
                </Badge>
                <span className="font-medium">{nameOf(e.user_id)}</span>
                <span className="truncate max-w-[320px]">{e.label || "—"}</span>
                <code className="text-xs text-muted-foreground">{e.path}</code>
                <span className="ml-auto text-xs text-muted-foreground">{rel(e.created_at)}</span>
              </div>
            ))}
            {!uf(events).length && (
              <p className="p-6 text-sm text-muted-foreground">
                No activity captured yet — page views and clicks start recording as members use the app.
              </p>
            )}
          </ScrollArea>
        </TabsContent>

        {/* MESSAGES */}
        <TabsContent value="messages" className="mt-4">
          <ScrollArea className="h-[600px] rounded-xl border border-border">
            {uf(messages).map((m) => (
              <div key={`${m.source}-${m.id}`} className="px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px]">
                    {m.source === "Watch party" ? <Tv className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                    {m.source}
                  </Badge>
                  <span className="font-medium text-foreground">{nameOf(m.user_id)}</span>
                  <span className="ml-auto">{rel(m.created_at)}</span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap break-words">{m.body || "(no text)"}</p>
              </div>
            ))}
            {!uf(messages).length && <p className="p-6 text-sm text-muted-foreground">No messages found.</p>}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
