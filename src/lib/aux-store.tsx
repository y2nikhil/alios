import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type AuxCategory = "productive" | "neutral" | "unproductive";

export type AuxStatus = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  category: AuxCategory;
  is_paid: boolean;
  sort_order: number;
  shortcut_key: string | null;
  is_default: boolean;
};

export type AuxSession = {
  id: string;
  user_id: string;
  status_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  note: string | null;
};

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
};

const AuxContext = createContext<AuxContextType | null>(null);

export function AuxProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<AuxStatus[]>([]);
  const [activeSession, setActiveSession] = useState<AuxSession | null>(null);
  const [todaySessions, setTodaySessions] = useState<AuxSession[]>([]);
  const [loading, setLoading] = useState(true);

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
      setStatuses([]);
      setActiveSession(null);
      setTodaySessions([]);
      setLoading(false);
    }
  }, [user, refresh]);

  const switchTo = useCallback(
    async (statusId: string) => {
      if (!user) return;
      // No-op if user clicks on already-active status — do NOT reset timer
      if (activeSession && activeSession.status_id === statusId) {
        const target = statuses.find((s) => s.id === statusId);
        toast.info(`Already in ${target?.name ?? "this status"}`);
        return;
      }
      const now = new Date().toISOString();
      // End active session if exists
      if (activeSession) {
        const dur = Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 1000);
        await supabase
          .from("aux_sessions")
          .update({ ended_at: now, duration_seconds: dur })
          .eq("id", activeSession.id);
      }
      const { data, error } = await supabase
        .from("aux_sessions")
        .insert({ user_id: user.id, status_id: statusId, started_at: now })
        .select()
        .single();
      if (error) {
        toast.error("Failed to switch status");
        return;
      }
      setActiveSession(data as AuxSession);
      const target = statuses.find((s) => s.id === statusId);
      if (target) toast.success(`Switched to ${target.name}`);
      refresh();
    },
    [user, activeSession, statuses, refresh],
  );

  const createStatus = useCallback(
    async (s: Partial<AuxStatus>) => {
      if (!user) return;
      const { error } = await supabase.from("aux_statuses").insert({
        user_id: user.id,
        name: s.name ?? "New status",
        color: s.color ?? "#10b981",
        category: s.category ?? "neutral",
        is_paid: s.is_paid ?? true,
        sort_order: s.sort_order ?? statuses.length + 1,
        shortcut_key: s.shortcut_key ?? null,
      });
      if (error) toast.error(error.message);
      else {
        toast.success("Status created");
        refresh();
      }
    },
    [user, statuses, refresh],
  );

  const updateStatus = useCallback(
    async (id: string, s: Partial<AuxStatus>) => {
      const { error } = await supabase.from("aux_statuses").update(s).eq("id", id);
      if (error) toast.error(error.message);
      else refresh();
    },
    [refresh],
  );

  const deleteStatus = useCallback(
    async (id: string) => {
      const { error } = await supabase.from("aux_statuses").delete().eq("id", id);
      if (error) toast.error(error.message);
      else {
        toast.success("Status deleted");
        refresh();
      }
    },
    [refresh],
  );

  const activeStatus = useMemo(
    () => statuses.find((s) => s.id === activeSession?.status_id) ?? null,
    [statuses, activeSession],
  );

  // Keyboard shortcuts 1-9
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      if (!/^[1-9]$/.test(key)) return;
      const target = statuses.find((s) => s.shortcut_key === key);
      if (target) {
        e.preventDefault();
        switchTo(target.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [statuses, switchTo]);

  return (
    <AuxContext.Provider
      value={{ statuses, activeSession, activeStatus, todaySessions, loading, switchTo, refresh, createStatus, updateStatus, deleteStatus }}
    >
      {children}
    </AuxContext.Provider>
  );
}

export function useAux() {
  const ctx = useContext(AuxContext);
  if (!ctx) throw new Error("useAux must be used within AuxProvider");
  return ctx;
}
