import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cachedQuery, invalidateCache, TTL } from "@/lib/cache";

export type AppRole = "super_admin" | "admin" | "member";

type State = {
  roles: AppRole[];
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isMember: boolean;
};

export function rolesKey(userId: string) {
  return `roles:${userId}`;
}

/** Call after granting/revoking a role so cached readers pick it up. */
export function invalidateRoles() {
  invalidateCache("roles:");
}

export async function fetchRoles(userId: string): Promise<AppRole[]> {
  return cachedQuery(rolesKey(userId), TTL.long, async () => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    return (data?.map((r) => r.role as AppRole)) ?? [];
  });
}

export function useRole(): State {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const next = await fetchRoles(user.id);
      if (cancelled) return;
      setRoles(next);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = isSuperAdmin || roles.includes("admin");
  const isMember = roles.includes("member") || (!isAdmin && !isSuperAdmin);

  return { roles, loading, isSuperAdmin, isAdmin, isMember };
}
