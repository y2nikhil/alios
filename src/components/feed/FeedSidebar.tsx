import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Radio, Trophy, CalendarDays, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAuthors, type Author, type Post } from "@/lib/feed";

type Party = { id: string; title: string; poster_url: string | null };
type LeaderRow = { id: string; name: string; hours: number };
type EventItem = { id: string; label: string; emoji: string; date: string };

function Card({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-amber-300">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        {action && <span className="ml-auto text-xs">{action}</span>}
      </div>
      {children}
    </section>
  );
}

export function FeedSidebar({ posts, onPickTag }: { posts: Post[]; onPickTag?: (tag: string) => void }) {
  const [parties, setParties] = useState<Party[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const trending = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => { if (p.tag) map.set(p.tag, (map.get(p.tag) ?? 0) + 1); });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [posts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("watch_parties")
        .select("id, title, poster_url")
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(4);
      if (!cancelled) setParties((data ?? []) as Party[]);

      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: sessions } = await supabase
        .from("aux_sessions")
        .select("user_id, duration_seconds")
        .gte("started_at", since)
        .limit(2000);
      const totals = new Map<string, number>();
      (sessions ?? []).forEach((s: any) => {
        totals.set(s.user_id, (totals.get(s.user_id) ?? 0) + (s.duration_seconds ?? 0));
      });
      const top = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top.length) {
        const authors: Record<string, Author> = await fetchAuthors(top.map(([id]) => id));
        if (!cancelled) {
          setLeaders(top.map(([id, secs]) => ({
            id,
            name: authors[id]?.display_name ?? authors[id]?.username ?? "Student",
            hours: Math.round(secs / 3600),
          })));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("alios.countdowns.v2");
      const list = raw ? (JSON.parse(raw) as EventItem[]) : [];
      setEvents(
        list
          .filter((e) => new Date(e.date + "T00:00:00").getTime() >= Date.now() - 86400000)
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 3),
      );
    } catch { /* noop */ }
  }, []);

  return (
    <aside className="hidden w-[320px] shrink-0 space-y-3 xl:block">
      <Card title="Trending Now" icon={<Flame className="h-4 w-4" />}>
        {trending.length === 0 ? (
          <p className="text-xs text-muted-foreground">No trends yet — start posting.</p>
        ) : (
          <ul className="space-y-2">
            {trending.map(([tag, n]) => (
              <li key={tag}>
                <button
                  onClick={() => onPickTag?.(tag)}
                  className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-white/5"
                >
                  <span className="text-muted-foreground">#</span>
                  <span className="truncate">{tag}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{n} posts</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Live Study Rooms" icon={<Radio className="h-4 w-4" />} action={<Link to="/app/party" className="text-amber-300 hover:underline">See all</Link>}>
        {parties.length === 0 ? (
          <p className="text-xs text-muted-foreground">No live rooms right now.</p>
        ) : (
          <ul className="space-y-2">
            {parties.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-2">
                {p.poster_url ? (
                  <img src={p.poster_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-xs">📺</div>
                )}
                <p className="min-w-0 flex-1 truncate text-sm">{p.title}</p>
                <Link
                  to="/app/hangout/$partyId"
                  params={{ partyId: p.id }}
                  className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-semibold text-black"
                >
                  Join
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Weekly Leaderboard" icon={<Trophy className="h-4 w-4" />}>
        {leaders.length === 0 ? (
          <p className="text-xs text-muted-foreground">Focus this week to appear here.</p>
        ) : (
          <ul className="space-y-2">
            {leaders.map((l, i) => (
              <li key={l.id} className="flex items-center gap-2 text-sm">
                <span>{["🥇", "🥈", "🥉"][i]}</span>
                <Link to="/app/u/$userId" params={{ userId: l.id }} className="min-w-0 flex-1 truncate hover:underline">{l.name}</Link>
                <span className="text-xs text-muted-foreground">{l.hours}h</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Upcoming Events" icon={<CalendarDays className="h-4 w-4" />} action={<Link to="/app/calendar" className="text-amber-300 hover:underline">See all</Link>}>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Add a countdown on Home to see it here.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => {
              const days = Math.ceil((new Date(e.date + "T00:00:00").getTime() - Date.now()) / 86400000);
              return (
                <li key={e.id} className="flex items-center gap-2 rounded-xl bg-white/[0.03] p-2 text-sm">
                  <span>{e.emoji || "📅"}</span>
                  <span className="min-w-0 flex-1 truncate">{e.label}</span>
                  <span className="text-xs text-muted-foreground">{days <= 0 ? "Today" : `in ${days}d`}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-400/10 to-orange-500/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-semibold">AI Suggestion for You</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Ask the ClassLab assistant for a study plan, doubt-solving or a revision roadmap based on your prep profile.
        </p>
        <Link to="/app/assistant" className="mt-3 inline-block rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-1.5 text-xs font-semibold text-black">
          Continue with AI
        </Link>
      </section>
    </aside>
  );
}
