import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck, CalendarOff, UserCircle2, Crown, Sun, Moon, Bell } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ProfileMenu() {
  const { user, signOut } = useAuth();
  const { isSuperAdmin, isAdmin } = useRole();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [adminOpen, setAdminOpen] = useState(false);
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle().then(({ data }) => {
      setUsername((data as { username?: string } | null)?.username ?? null);
    });
  }, [user]);


  const initial = (username?.[0] ?? user?.email?.[0] ?? "?").toUpperCase();
  const handle = username ? `@${username}` : user?.email;


  async function applyForAdmin() {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("admin_requests").insert({ user_id: user.id, reason: reason.trim() || null });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "You already have a pending request." : error.message);
      return;
    }
    toast.success("Admin (Client) request submitted. Awaiting super admin review.");
    setReason("");
    setAdminOpen(false);
  }

  async function submitTimeOff() {
    if (!user || !start || !end) {
      toast.error("Pick start and end dates.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("time_off_requests").insert({
      user_id: user.id,
      start_date: start,
      end_date: end,
      reason: reason.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Time-off request submitted.");
    setReason("");
    setStart("");
    setEnd("");
    setTimeOffOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors pl-1 pr-3 py-1 border border-white/10">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-white">
              {initial}
            </div>
            <span className="hidden md:inline text-xs font-medium max-w-[140px] truncate">{handle}</span>
            {isSuperAdmin && <Crown className="h-3.5 w-3.5 text-amber-400" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            {username && <span className="text-xs font-semibold truncate">@{username}</span>}
            <span className="text-[11px] text-muted-foreground truncate">{user?.email}</span>
            <span className="text-[10px] text-muted-foreground">
              {isSuperAdmin ? "Super Admin" : isAdmin ? "Admin (Client)" : "Member"}
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: "/app/settings" })}>
            <UserCircle2 className="h-4 w-4 mr-2" /> Account settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate({ to: "/app/notifications" })}>
            <Bell className="h-4 w-4 mr-2" /> Notifications
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.preventDefault(); toggle(); }}>
            {theme === "dark" ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isSuperAdmin && (
            <DropdownMenuItem onClick={() => navigate({ to: "/app/super" })}>
              <Crown className="h-4 w-4 mr-2 text-amber-400" /> Super Admin Panel
            </DropdownMenuItem>
          )}
          {isAdmin && (
            <DropdownMenuItem onClick={() => navigate({ to: "/app/admin" })}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Admin Panel
            </DropdownMenuItem>
          )}
          {!isAdmin && (
            <DropdownMenuItem onClick={() => setAdminOpen(true)}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Apply to be Admin (Client)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setTimeOffOpen(true)}>
            <CalendarOff className="h-4 w-4 mr-2" /> Request time off
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to be an Admin (Client)</DialogTitle>
            <DialogDescription>Your request will be sent to the Super Admin for approval.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason (optional)…" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminOpen(false)}>Cancel</Button>
            <Button onClick={applyForAdmin} disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeOffOpen} onOpenChange={setTimeOffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request time off</DialogTitle>
            <DialogDescription>An admin will review your request.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="to-start">Start date</Label>
              <Input id="to-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to-end">End date</Label>
              <Input id="to-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeOffOpen(false)}>Cancel</Button>
            <Button onClick={submitTimeOff} disabled={submitting}>{submitting ? "Submitting…" : "Request"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
