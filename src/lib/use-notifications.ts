import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { playNotificationSound, soundForCategory } from "@/lib/notification-sounds";
import { showLocalNotification } from "@/lib/push-client";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) console.error("notifications load failed", error);
      setItems((data ?? []) as Notification[]);
    } catch (e) {
      console.error("notifications load failed", e);
      setItems([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel(`notifs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 50));
          // Sound
          playNotificationSound(soundForCategory(n.type));
          // In-tab toast
          toast(n.title, { description: n.body ?? undefined });
          // OS notification when tab is hidden
          if (typeof document !== "undefined" && document.hidden) {
            void showLocalNotification(n.title, n.body ?? undefined, n.link ?? undefined);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  const unread = items.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    try {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    } catch (e) {
      console.error("markRead failed", e);
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    try {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    } catch (e) {
      console.error("markAllRead failed", e);
    }
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
  };

  return { items, unread, loading, markRead, markAllRead, reload: load };
}
