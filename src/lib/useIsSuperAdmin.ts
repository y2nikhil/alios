import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useIsSuperAdmin(): boolean {
  const { user } = useAuth();
  const [isSuper, setIsSuper] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsSuper(false); return; }
    (async () => {
      const { data } = await (supabase.from("user_roles") as any)
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      if (!cancelled) setIsSuper(!!data);
    })();
    return () => { cancelled = true; };
  }, [user]);
  return isSuper;
}
