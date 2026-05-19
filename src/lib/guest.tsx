import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const GUEST_KEY = "alios-guest";

export type GuestUser = {
  id: string;
  display_name: string;
  created_at: string;
};

type Ctx = {
  guest: GuestUser | null;
  startGuest: (displayName?: string) => GuestUser;
  endGuest: () => void;
};

const GuestCtx = createContext<Ctx>({
  guest: null,
  startGuest: () => ({ id: "", display_name: "", created_at: "" }),
  endGuest: () => {},
});

function readGuest(): GuestUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestUser;
    if (parsed?.id && parsed?.display_name) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestUser | null>(null);

  useEffect(() => {
    setGuest(readGuest());
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_KEY) setGuest(readGuest());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const startGuest = (displayName?: string): GuestUser => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `g_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const next: GuestUser = {
      id,
      display_name: displayName?.trim() || `Guest ${id.slice(0, 4)}`,
      created_at: new Date().toISOString(),
    };
    localStorage.setItem(GUEST_KEY, JSON.stringify(next));
    setGuest(next);
    return next;
  };

  const endGuest = () => {
    localStorage.removeItem(GUEST_KEY);
    setGuest(null);
  };

  return <GuestCtx.Provider value={{ guest, startGuest, endGuest }}>{children}</GuestCtx.Provider>;
}

export const useGuest = () => useContext(GuestCtx);

/** Convenience: get the current identity (auth user or guest). Group features should still gate on real auth. */
export function useIdentity() {
  const { guest } = useGuest();
  return guest;
}
