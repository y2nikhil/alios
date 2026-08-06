import { createContext, useContext, useEffect, type ReactNode } from "react";

type Theme = "dark";
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void };

const ThemeCtx = createContext<Ctx>({ theme: "dark", setTheme: () => {}, toggle: () => {} });

// Dark mode only — light mode has been removed from the product.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    try {
      localStorage.setItem("alios-theme", "dark");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme: "dark", setTheme: () => {}, toggle: () => {} }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
