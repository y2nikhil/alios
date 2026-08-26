import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2, Play, Pause, Plus, RefreshCw, Trash2, GraduationCap, ExternalLink, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-role";

type QueueRow = {
  id: string;
  name: string;
  city: string | null;
  exam_track: string;
  kind?: string | null;
  priority: number;
  status: string;
  error: string | null;
  attempts: number;
  post_id: string | null;
  published_at: string | null;
};


type RunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  requested: number;
  succeeded: number;
  failed: number;
  error: string | null;
};

type PipelineState = {
  daily_limit: number;
  paused: boolean;
  pause_reason: string | null;
  last_run_at: string | null;
};

const TRACKS = ["cat", "jee", "neet", "railways", "ssc_upsc", "banking", "other"];

export const Route = createFileRoute("/app/college-pipeline")({
  head: () => ({
    meta: [
      { title: "College Pipeline — ClassLab Studio" },
      { name: "description", content: "Queue colleges and let ClassLab auto-publish daily college review articles." },
      { property: "og:title", content: "College Pipeline — ClassLab Studio" },
      { property: "og:description", content: "Queue colleges and let ClassLab auto-publish daily college review articles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CollegePipeline,
});

function CollegePipeline() {
  const { isAdmin, loading: roleLoading } = useRole();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [state, setState] = useState<PipelineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bulk, setBulk] = useState("");
  const [track, setTrack] = useState("cat");
  const [mode, setMode] = useState<"college" | "topic">("college");
  const [running, setRunning] = useState(false);

  const load = async () => {
    const db = supabase as any;
    const [{ data: q }, { data: r }, { data: s }] = await Promise.all([
      db.from("college_queue").select("*").order("status").order("priority").order("created_at").limit(500),
      db.from("college_gen_runs").select("*").order("started_at", { ascending: false }).limit(10),
      db.from("college_pipeline_state").select("*").eq("id", 1).maybeSingle(),
    ]);
    setRows((q ?? []) as QueueRow[]);
    setRuns((r ?? []) as RunRow[]);
    setState((s ?? null) as PipelineState | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addBulk = async () => {
    const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const { data: user } = await supabase.auth.getUser();
    const existing = new Set(rows.map((r) => r.name.toLowerCase()));
    const seen = new Set<string>();
    const payload = lines
      .map((line, i) => {
        if (mode === "topic") {
          return {
            name: line,
            city: null as string | null,
            exam_track: track,
            kind: "topic",
            priority: 50 + i,
            created_by: user.user?.id ?? null,
          };
        }
        const [name, city] = line.split(",").map((p) => p.trim());
        return {
          name,
          city: city || null,
          exam_track: track,
          kind: "college",
          priority: 100 + i,
          created_by: user.user?.id ?? null,
        };
      })
      .filter((p) => {
        const k = p.name.toLowerCase();
        if (!p.name || existing.has(k) || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    if (!payload.length) {
      setBulk("");
      return toast.info("Those entries are already in the queue");
    }
    const { error } = await (supabase as any).from("college_queue").insert(payload);
    if (error) return toast.error(error.message);
    setBulk("");
    toast.success(`${payload.length} ${mode === "topic" ? "topic" : "college"}${payload.length > 1 ? "s" : ""} queued`);
    load();
  };

  const retry = async (id: string) => {
    await (supabase as any).from("college_queue").update({ status: "pending", attempts: 0, error: null }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("college_queue").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((p) => p.filter((r) => r.id !== id));
  };

  const cancelRun = async (id: string) => {
    await (supabase as any)
      .from("college_gen_runs")
      .update({ finished_at: new Date().toISOString(), error: "Cancelled by admin" })
      .eq("id", id);
    await (supabase as any).from("college_queue").update({ status: "pending" }).eq("status", "generating");
    toast.success("Run cleared");
    load();
  };


  const togglePause = async () => {
    if (!state) return;
    await (supabase as any)
      .from("college_pipeline_state")
      .update({ paused: !state.paused, pause_reason: state.paused ? null : "Paused by admin" })
      .eq("id", 1);
    load();
  };

  const setLimit = async (n: number) => {
    await (supabase as any).from("college_pipeline_state").update({ daily_limit: n }).eq("id", 1);
    load();
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/public/hooks/generate-college-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.ok) toast.success(`Published ${json.succeeded} article${json.succeeded === 1 ? "" : "s"}`);
      else toast.error(json.error ?? json.reason ?? "Run did not complete");
    } catch (e: any) {
      toast.error(e?.message ?? "Run failed");
    } finally {
      setRunning(false);
      load();
    }
  };

  if (roleLoading || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAdmin) {
    return <p className="mx-auto max-w-lg px-4 py-20 text-center text-sm text-muted-foreground">Admins only.</p>;
  }

  const pending = rows.filter((r) => r.status === "pending").length;
  const published = rows.filter((r) => r.status === "published").length;
  const failed = rows.filter((r) => r.status === "failed").length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/15 via-background to-background p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300">
              <GraduationCap className="h-3 w-3" /> College Pipeline
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">Auto-published college reviews</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Paste colleges below. Every day the pipeline researches and publishes the next{" "}
              <strong className="text-foreground">{state?.daily_limit ?? 5}</strong> as full 27-section review articles under the admin account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={runNow}
              disabled={running || pending === 0}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run now
            </button>
            <button onClick={togglePause} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm">
              {state?.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />} {state?.paused ? "Resume" : "Pause"}
            </button>
            <Link to="/app/blog" className="rounded-full border border-white/10 px-4 py-2 text-sm">Blog studio</Link>
          </div>
        </div>
      </section>

      {state?.paused && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Pipeline paused</p>
            <p className="text-amber-200/80">{state.pause_reason ?? "Paused by admin."} Daily runs will only send one probe article until it recovers.</p>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Queued", value: pending },
          { label: "Published", value: published },
          { label: "Failed", value: failed },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Add to queue</h2>
          <div className="ml-auto inline-flex rounded-full border border-white/10 p-0.5">
            {(["college", "topic"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                  mode === m ? "bg-amber-400 text-black" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "college" ? "College review" : "Blog topic"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {mode === "college" ? (
            <>One college per line. Optionally <code className="text-amber-300">Name, City</code>.</>
          ) : (
            <>One topic per line — AI researches it and publishes a full blog article.</>
          )}
        </p>
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          rows={6}
          placeholder={
            mode === "college"
              ? "IIM Ahmedabad, Ahmedabad\nFMS Delhi, New Delhi\nIIT Bombay, Mumbai"
              : "How to crack CAT 2026 in 6 months\nNEET 2026 biology revision plan\nBest SSC CGL study routine for working professionals"
          }
          className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs outline-none focus:border-amber-300/40"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="rounded-full border border-white/10 bg-black/60 px-3 py-2 text-xs"
          >
            {TRACKS.map((t) => <option key={t} value={t} className="bg-black">{t.toUpperCase()}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Per day
            <input
              type="number"
              min={1}
              max={10}
              defaultValue={state?.daily_limit ?? 5}
              onBlur={(e) => setLimit(Math.max(1, Math.min(10, Number(e.target.value) || 5)))}
              className="w-16 rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-foreground"
            />
          </label>
          <button onClick={addBulk} className="ml-auto inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-black">
            <Plus className="h-4 w-4" /> Add to queue
          </button>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Queue is empty — paste colleges or topics above.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{r.name}</div>
                  {r.city && <div className="text-xs text-muted-foreground">{r.city}</div>}
                  {r.error && <div className="mt-1 line-clamp-2 text-[11px] text-rose-300">{r.error}</div>}
                </td>
                <td className="px-4 py-2.5 text-xs uppercase text-muted-foreground">
                  {r.kind === "topic" ? "Topic" : r.exam_track}
                </td>

                <td className="px-4 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    r.status === "published" ? "bg-emerald-400/10 text-emerald-300"
                    : r.status === "failed" ? "bg-rose-400/10 text-rose-300"
                    : r.status === "generating" ? "bg-amber-400/10 text-amber-300"
                    : "bg-white/10 text-muted-foreground"}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    {r.post_id && (
                      <Link to="/app/blog" className="rounded-full bg-white/5 p-2 hover:bg-white/10" aria-label="Open blog studio">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                    {r.status !== "pending" && r.status !== "published" && (
                      <button onClick={() => retry(r.id)} className="rounded-full bg-white/5 p-2 hover:bg-white/10" aria-label="Retry">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => remove(r.id)} className="rounded-full bg-white/5 p-2 hover:bg-rose-500/20" aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold">Recent runs</h2>
        <div className="mt-2 space-y-2">
          {runs.length === 0 && <p className="text-xs text-muted-foreground">No runs yet.</p>}
          {runs.map((run) => (
            <div key={run.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs">
              <span className="text-muted-foreground">{new Date(run.started_at).toLocaleString()}</span>
              <span className="text-emerald-300">{run.succeeded} published</span>
              {run.failed > 0 && <span className="text-rose-300">{run.failed} failed</span>}
              {!run.finished_at && <span className="text-amber-300">running…</span>}
              {run.error && <span className="text-rose-300">{run.error}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
