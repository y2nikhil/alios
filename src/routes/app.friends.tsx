import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, UserPlus, Check, X, Loader2, Search, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AvatarIconRender } from "@/components/AvatarIcon";

export const Route = createFileRoute("/app/friends")({
  head: () => ({ meta: [{ title: "Friends — ALIOS" }] }),
  component: FriendsPage,
});

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  profile?: { id: string; display_name: string | null; username: string | null; avatar_url: string | null; avatar_icon: string | null; avatar_gradient: string | null };
};

function FriendsPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [list, setList] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const openDm = async (otherId: string) => {
    const { data, error } = await (supabase.rpc as any)("get_or_create_dm_thread", { _other: otherId });
    if (error) { toast.error(error.message); return; }
    nav({ to: "/app/dm/$threadId", params: { threadId: data as string } });
  };

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase.from("friendships") as any)
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    const rows = (data ?? []) as Friendship[];
    const otherIds = rows.map((r) => (r.requester_id === user.id ? r.addressee_id : r.requester_id));
    let profiles: any[] = [];
    if (otherIds.length) {
      const { data: pr } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, avatar_icon, avatar_gradient")
        .in("id", otherIds);
      profiles = pr ?? [];
    }
    const map = new Map(profiles.map((p) => [p.id, p]));
    setList(rows.map((r) => ({ ...r, profile: map.get(r.requester_id === user.id ? r.addressee_id : r.requester_id) })));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const term = q.trim();
    if (!term || !user) { setResults([]); return; }
    let cancelled = false;
    setSearching(true);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/search-people", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ q: term }),
      }).then((r) => r.json()).catch(() => ({ results: [] }));
      if (!cancelled) {
        setResults((res.results ?? []).filter((p: any) => p.id !== user.id));
        setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, user]);

  const sendRequest = async (addresseeId: string) => {
    if (!user) return;
    const { error } = await (supabase.from("friendships") as any).insert({
      requester_id: user.id, addressee_id: addresseeId,
    });
    if (error) return toast.error(error.message.includes("duplicate") ? "Already requested" : error.message);
    toast.success("Friend request sent");
    load();
  };

  const accept = async (id: string) => {
    const { error } = await (supabase.from("friendships") as any).update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Friend added");
    load();
  };

  const remove = async (id: string) => {
    await (supabase.from("friendships") as any).delete().eq("id", id);
    load();
  };

  const accepted = list.filter((f) => f.status === "accepted");
  const incoming = list.filter((f) => f.status === "pending" && f.addressee_id === user?.id);
  const outgoing = list.filter((f) => f.status === "pending" && f.requester_id === user?.id);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto glide-in">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
          <p className="text-sm text-muted-foreground">Stay connected with your study crew</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-violet-400" />
          <h3 className="font-semibold text-sm">Find people</h3>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, @username, or email…" />
        {searching && <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</div>}
        {results.length > 0 && (
          <div className="mt-3 space-y-1">
            {results.map((p) => {
              const existing = list.find((f) => f.profile?.id === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5">
                  <Avatar p={p} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.display_name ?? p.username ?? "User"}</p>
                    {p.username && <p className="text-[11px] text-muted-foreground">@{p.username}</p>}
                  </div>
                  {existing ? (
                    <span className="text-xs text-muted-foreground capitalize">{existing.status}</span>
                  ) : (
                    <Button size="sm" onClick={() => sendRequest(p.id)} className="bg-gradient-to-r from-violet-500 to-cyan-400">
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <Section title={`Incoming requests (${incoming.length})`}>
          {incoming.map((f) => (
            <Row key={f.id} f={f}
              right={
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => accept(f.id)} className="text-emerald-400"><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(f.id)} className="text-destructive"><X className="h-4 w-4" /></Button>
                </div>
              }
            />
          ))}
        </Section>
      )}

      <Section title={`Friends (${accepted.length})`}>
        {loading ? <p className="text-xs text-muted-foreground p-2"><Loader2 className="h-3 w-3 animate-spin inline mr-1" /> Loading…</p> :
          accepted.length === 0 ? <p className="text-xs text-muted-foreground p-2">No friends yet. Search above to add some! 👋</p> :
          accepted.map((f) => (
            <Row key={f.id} f={f}
              right={
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => f.profile && openDm(f.profile.id)} className="text-cyan-400">
                    <MessageCircle className="h-3.5 w-3.5 mr-1" /> Message
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(f.id)} className="text-destructive">Remove</Button>
                </div>
              }
            />
          ))
        }
      </Section>

      {outgoing.length > 0 && (
        <Section title={`Pending (${outgoing.length})`}>
          {outgoing.map((f) => (
            <Row key={f.id} f={f}
              right={<Button size="sm" variant="ghost" onClick={() => remove(f.id)}>Cancel</Button>}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl">
      <div className="px-4 py-3 border-b border-white/5"><h3 className="font-semibold text-sm">{title}</h3></div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

function Row({ f, right }: { f: Friendship; right: React.ReactNode }) {
  const p = f.profile;
  if (!p) return null;
  return (
    <div className="flex items-center gap-3 p-3">
      <Avatar p={p} />
      <Link to="/app/u/$userId" params={{ userId: p.id }} className="flex-1 min-w-0 hover:underline">
        <p className="text-sm font-medium truncate">{p.display_name ?? p.username ?? "User"}</p>
        {p.username && <p className="text-[11px] text-muted-foreground">@{p.username}</p>}
      </Link>
      {right}
    </div>
  );
}

function Avatar({ p }: { p: any }) {
  return (
    <AvatarIconRender
      icon={p.avatar_icon}
      gradient={p.avatar_gradient}
      initial={p.display_name?.[0] ?? p.username?.[0] ?? "?"}
      className="h-9 w-9 shrink-0 rounded-full grid place-items-center"
    />
  );
}
