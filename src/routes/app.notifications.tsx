import { createFileRoute, redirect } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useNotifications } from "@/lib/use-notifications";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/notifications")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Notifications — ClassLab" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/30">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground">{unread} unread of {items.length} total</p>
          </div>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="h-3.5 w-3.5 mr-1" /> Mark all read
          </Button>
        )}
      </header>

      <div className="glass rounded-2xl divide-y divide-border">
        {items.length === 0 ? (
          <p className="p-12 text-center text-sm text-muted-foreground">You're all caught up.</p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.read_at && markRead(n.id)}
              className={cn(
                "w-full text-left p-4 hover:bg-accent/30 transition-colors",
                !n.read_at && "bg-accent/20",
              )}
            >
              <div className="flex items-start gap-3">
                {!n.read_at && <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
