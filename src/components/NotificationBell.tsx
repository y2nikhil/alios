import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, Check } from "lucide-react";
import { useNotifications } from "@/lib/use-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const { items, unread, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 max-h-[500px] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={() => markAllRead()} className="text-[10px] text-muted-foreground hover:text-foreground">
              Mark all read
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <p className="p-6 text-center text-xs text-muted-foreground">You're all caught up.</p>
          ) : (
            items.slice(0, 12).map((n) => (
              <button
                key={n.id}
                onClick={async () => {
                  if (!n.read_at) await markRead(n.id);
                  if (n.link) navigate({ to: n.link as any });
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 border-b border-border/40 hover:bg-accent/40 transition-colors",
                  !n.read_at && "bg-accent/20",
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{n.title}</p>
                    {n.body && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { navigate({ to: "/app/notifications" }); setOpen(false); }}>
            View all
            <Check className="h-3 w-3 ml-1.5 opacity-0" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
