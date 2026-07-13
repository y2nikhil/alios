import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActiveSanction = { kind: string; reason: string | null; expires_at: string | null; created_at: string };

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [ban, setBan] = useState<ActiveSanction | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) { setChecked(true); return; }
      const { data } = await (supabase.from("user_sanctions") as any)
        .select("kind, reason, expires_at, created_at")
        .eq("user_id", user.id)
        .in("kind", ["temp_ban", "perma_ban"])
        .is("lifted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      const row = (data ?? [])[0] as ActiveSanction | undefined;
      if (row && (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())) {
        setBan(row);
      } else {
        setBan(null);
      }
      setChecked(true);
    }
    check();
    return () => { cancelled = true; };
  }, [user]);

  if (loading || !checked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return null;

  if (ban) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center rounded-2xl border border-red-500/30 bg-red-500/5 p-8">
          <div className="mx-auto h-14 w-14 rounded-full bg-red-500/20 grid place-items-center mb-4">
            <Ban className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold">Your account is {ban.kind === "perma_ban" ? "permanently suspended" : "temporarily suspended"}</h1>
          {ban.reason && <p className="mt-2 text-sm text-muted-foreground">Reason: {ban.reason}</p>}
          {ban.expires_at && (
            <p className="mt-2 text-sm text-muted-foreground">
              Access restored on {new Date(ban.expires_at).toLocaleString()}
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            If you believe this is a mistake, contact an admin.
          </p>
          <Button variant="outline" className="mt-6" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
