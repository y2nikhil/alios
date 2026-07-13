import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

export type AuxCategory = "productive" | "neutral" | "unproductive";

export type AuxStatus = {
  id: string; user_id: string; name: string; color: string;
  category: AuxCategory; is_paid: boolean; sort_order: number;
  shortcut_key: string | null; is_default: boolean;
};

export type AuxSession = {
  id: string; user_id: string; status_id: string;
  started_at: string; ended_at: string | null;
  duration_seconds: number | null; note: string | null;
};

type ResumePrompt = { status: AuxStatus; recentSession: AuxSession };

type AuxContextType = {
  statuses: AuxStatus[];
  activeSession: AuxSession | null;
  activeStatus: AuxStatus | null;
  todaySessions: AuxSession[];
  loading: boolean;
  switchTo: (statusId: string) => Promise<void>;
  refresh: () => Promise<void>;
  createStatus: (s: Partial<AuxStatus>) => Promise<void>;
  updateStatus: (id: string, s: Partial<AuxStatus>) => Promise<void>;
  deleteStatus: (id: string) => Promise<void>;
  endActiveSession: () => Promise<void>;
  markNotResponding: () => Promise<void>;
};

const AuxContext = createContext<AuxContextType | null>(null);

const RESUME_WINDOW_MS = 4 * 60 * 60 * 1000; // 4 hours

export function AuxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<AuxStatus[]>([]);
  const [activeSession, setActiveSession] = useState<AuxSession | null>(null);
  const [todaySessions, setTodaySessions] = useState<AuxSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumePrompt, setResumePrompt] = useState<ResumePrompt | null>(null);
  const activeSessionRef = useRef<AuxSession | null>(null);
  useEffect(() => { activeSessionRef.current = activeSession; }, [activeSession]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [stRes, actRes, todayRes] = await Promise.all([
      supabase.from("aux_statuses").select("*").eq("user_id", user.id).order("sort_order"),
      supabase.from("aux_sessions").select("*").eq("user_id", user.id).is("ended_at", null).order("started_at", { ascending: false }).limit(1),
      supabase.from("aux_sessions").select("*").eq("user_id", user.id).gte("started_at", today.toISOString()).order("started_at", { ascending: true }),
    ]);
    if (stRes.data) setStatuses(stRes.data as AuxStatus[]);
    setActiveSession((actRes.data?.[0] as AuxSession) ?? null);
    if (todayRes.data) setTodaySessions(todayRes.data as AuxSession[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) refresh();
    else {
      setStatuses([]); setActiveSession(null); setTodaySessions([]); setLoading(false);
    }
  }, [user, refresh]);

  const endActiveSession = useCallback(async () => {
    const cur = activeSessionRef.current;
    if (!cur) return;
    const dur = Math.floor((Date.now() - new Date(cur.started_at).getTime()) / 1000);
    await supabase.from("aux_sessions")
      .update({ ended_at: new Date().toISOString(), duration_seconds: dur })
      .eq("id", cur.id).is("ended_at", null);
    setActiveSession(null);
    refresh();
  }, [refresh]);

  const startNewSession = useCallback(async (statusId: string) => {
    if (!user) return;
    const now = new Date().toISOString();
    const cur = activeSessionRef.current;
    if (cur) {
      const dur = Math.floor((Date.now() - new Date(cur.started_at).getTime()) / 1000);
      await supabase.from("aux_sessions").update({ ended_at: now, duration_seconds: dur }).eq("id", cur.id);
    }
    const { data, error } = await supabase.from("aux_sessions")
      .insert({ user_id: user.id, status_id: statusId, started_at: now })
      .select().single();
    if (error) { toast.error("Failed to switch status"); return; }
    setActiveSession(data as AuxSession);
    const target = statuses.find((s) => s.id === statusId);
    if (target) toast.success(`Switched to ${target.name}`);
    refresh();
  }, [user, statuses, refresh]);

  const resumeExisting = useCallback(async (sessionId: string) => {
    if (!user) return;
    const cur = activeSessionRef.current;
    if (cur && cur.id !== sessionId) {
      const dur = Math.floor((Date.now() - new Date(cur.started_at).getTime()) / 1000);
      await supabase.from("aux_sessions").update({ ended_at: new Date().toISOString(), duration_seconds: dur }).eq("id", cur.id);
    }
    const { data, error } = await supabase.from("aux_sessions")
      .update({ ended_at: null, duration_seconds: null }).eq("id", sessionId).select().single();
    if (error) { toast.error("Could not resume session"); return; }
    setActiveSession(data as AuxSession);
    toast.success("Resumed previous timer");
    refresh();
  }, [user, refresh]);

  const switchTo = useCallback(
    async (statusId: string) => {
      if (!user) return;
      if (activeSession && activeSession.status_id === statusId) {
        const target = statuses.find((s) => s.id === statusId);
        toast.info(`Already in ${target?.name ?? "this status"}`);
        return;
      }
      // Look for a recently-ended session of the same status
      const cutoff = Date.now() - RESUME_WINDOW_MS;
      const recent = [...todaySessions]
        .filter((s) => s.status_id === statusId && s.ended_at && new Date(s.ended_at).getTime() >= cutoff)
        .sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];
      const target = statuses.find((s) => s.id === statusId);
      if (recent && target) {
        setResumePrompt({ status: target, recentSession: recent });
        return;
      }
      await startNewSession(statusId);
    },
    [user, activeSession, statuses, todaySessions, startNewSession],
  );

  const markNotResponding = useCallback(async () => {
    const cur = activeSessionRef.current;
    if (!cur) { toast.info("No active status to pause"); return; }
    const away = statuses.find((s) => s.name.toLowerCase() === "away");
    if (!away) { toast.error("No 'Away' status configured"); return; }
    await startNewSession(away.id);
    toast.info("Marked as Away — punch back in when you return");
  }, [statuses, startNewSession]);

  const createStatus = useCallback(async (s: Partial<AuxStatus>) => {
    if (!user) return;
    const { error } = await supabase.from("aux_statuses").insert({
      user_id: user.id, name: s.name ?? "New status", color: s.color ?? "#10b981",
      category: s.category ?? "neutral", is_paid: s.is_paid ?? true,
      sort_order: s.sort_order ?? statuses.length + 1, shortcut_key: s.shortcut_key ?? null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Status created"); refresh(); }
  }, [user, statuses, refresh]);

  const updateStatus = useCallback(async (id: string, s: Partial<AuxStatus>) => {
    const { error } = await supabase.from("aux_statuses").update(s).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  }, [refresh]);

  const deleteStatus = useCallback(async (id: string) => {
    const { error } = await supabase.from("aux_statuses").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status deleted"); refresh(); }
  }, [refresh]);

  const activeStatus = useMemo(
    () => statuses.find((s) => s.id === activeSession?.status_id) ?? null,
    [statuses, activeSession],
  );

  // Keyboard shortcuts 1-9
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!/^[1-9]$/.test(e.key)) return;
      const target = statuses.find((s) => s.shortcut_key === e.key);
      if (target) { e.preventDefault(); switchTo(target.id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [statuses, switchTo]);

  // Auto-close on sign-out
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") { void endActiveSession(); }
    });
    return () => sub.subscription.unsubscribe();
  }, [endActiveSession]);

  // Auto-close on tab close: best-effort with sendBeacon-style REST call
  useEffect(() => {
    if (!user) return;
    const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/rest/v1/aux_sessions`;
    const key = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const handler = () => {
      const cur = activeSessionRef.current;
      if (!cur) return;
      const dur = Math.floor((Date.now() - new Date(cur.started_at).getTime()) / 1000);
      const body = JSON.stringify({ ended_at: new Date().toISOString(), duration_seconds: dur });
      // Fire-and-forget PATCH using fetch with keepalive
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        fetch(`${url}?id=eq.${cur.id}&ended_at=is.null`, {
          method: "PATCH", keepalive: true,
          headers: {
            "Content-Type": "application/json",
            apikey: key,
            Authorization: `Bearer ${session.access_token}`,
            Prefer: "return=minimal",
          },
          body,
        }).catch(() => {});
      });
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [user]);

  return (
    <AuxContext.Provider
      value={{
        statuses, activeSession, activeStatus, todaySessions, loading,
        switchTo, refresh, createStatus, updateStatus, deleteStatus,
        endActiveSession, markNotResponding,
      }}
    >
      {children}
      <AlertDialog open={!!resumePrompt} onOpenChange={(o) => { if (!o) setResumePrompt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resume {resumePrompt?.status.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You were in <strong>{resumePrompt?.status.name}</strong> earlier today
              {resumePrompt?.recentSession.duration_seconds ? ` for ${Math.floor(resumePrompt.recentSession.duration_seconds / 60)}m ${resumePrompt.recentSession.duration_seconds % 60}s` : ""}.
              Do you want to resume that timer or start a fresh one?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={async () => {
                const p = resumePrompt; setResumePrompt(null);
                if (p) await startNewSession(p.status.id);
              }}
            >
              Start new timer
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const p = resumePrompt; setResumePrompt(null);
                if (p) await resumeExisting(p.recentSession.id);
              }}
            >
              Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuxContext.Provider>
  );
}

export function useAux() {
  const ctx = useContext(AuxContext);
  if (!ctx) throw new Error("useAux must be used within AuxProvider");
  return ctx;
}
