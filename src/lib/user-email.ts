import { supabase } from "@/integrations/supabase/client";
import { cachedQuery, TTL } from "@/lib/cache";

/** Looks up a user's email once per 10-minute window instead of on every render. */
export async function cachedUserEmail(userId: string): Promise<string | null> {
  return cachedQuery(`user_email:${userId}`, TTL.long, async () => {
    const { data } = await supabase.rpc("get_user_email", { _user_id: userId });
    return (data as string | null) ?? null;
  });
}
