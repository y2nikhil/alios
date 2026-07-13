import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Check, X, Users } from "lucide-react";
import { toast } from "sonner";

type Invite = {
  id: string; group_id: string; inviter_id: string; status: string;
  groups?: { name: string; emoji: string; slug: string };
  inviter?: { display_name: string | null; username: string | null };
};

export function GroupInvitesPanel({ onChanged }: { onChanged?: () => void }) {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase.from("group_invites") as any)
      .select("id, group_id, inviter_id, status")
      .eq("invitee_id", user.id).eq("status", "pending");
    const rows = (data ?? []) as Invite[];
    if (rows.length === 0) { setInvites([]); return; }
    const groupIds = Array.from(new Set(rows.map((r) => r.group_id)));
    const inviterIds = Array.from(new Set(rows.map((r) => r.inviter_id)));
    const [{ data: gs }, { data: ps }] = await Promise.all([
      supabase.from("groups").select("id,name,emoji,slug").in("id", groupIds),
      supabase.from("profiles").select("id,display_name,username").in("id", inviterIds),
    ]);
    const gm = new Map((gs ?? []).map((g: any) => [g.id, g]));
    const pm = new Map((ps ?? []).map((p: any) => [p.id, p]));
    setInvites(rows.map((r) => ({ ...r, groups: gm.get(r.group_id) as any, inviter: pm.get(r.inviter_id) as any })));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`invites-${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "group_invites", filter: `invitee_id=eq.${user.id}` },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, load]);

  const respond = async (inv: Invite, accept: boolean) => {
    if (!user) return;
    if (accept) {
      const { error: mErr } = await supabase.from("group_members").insert({ group_id: inv.group_id, user_id: user.id });
      if (mErr && !mErr.message.includes("duplicate")) { toast.error(mErr.message); return; }
    }
    await (supabase.from("group_invites") as any).update({
      status: accept ? "accepted" : "declined",
      responded_at: new Date().toISOString(),
    }).eq("id", inv.id);
    toast.success(accept ? "Joined group" : "Invite declined");
    load();
    onChanged?.();
  };

  if (invites.length === 0) return null;

  return (
    <div>
      <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300 mb-1 flex items-center gap-1">
        <Users className="h-3 w-3" /> Invites ({invites.length})
      </p>
      <div className="space-y-1.5 px-1">
        {invites.map((i) => (
          <div key={i.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
            <p className="text-xs">
              <span className="font-semibold">{i.inviter?.display_name ?? i.inviter?.username ?? "Someone"}</span> invited you to{" "}
              <span className="font-semibold">{i.groups?.emoji} {i.groups?.name ?? "a group"}</span>
            </p>
            <div className="flex gap-1.5 mt-1.5">
              <Button size="sm" className="h-6 text-[11px] px-2 flex-1" onClick={() => respond(i, true)}>
                <Check className="h-3 w-3 mr-1" /> Join
              </Button>
              <Button size="sm" variant="ghost" className="h-6 text-[11px] px-2" onClick={() => respond(i, false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
