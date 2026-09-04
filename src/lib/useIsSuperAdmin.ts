import { useRole } from "@/lib/use-role";

/** Shares the cached role lookup with useRole — no extra database query. */
export function useIsSuperAdmin(): boolean {
  return useRole().isSuperAdmin;
}
