"use client";

/* ThemeProvider — port clone/js/shell.js applyTheme + settings theme.
   Key "nhai.theme" (light|dark), toggle class "dark" trên <html>. */

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void } | null>(null);

function readInitialTheme(): Theme {
  try {
    return localStorage.getItem("nhai.theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const v = useContext(ThemeContext);
  if (!v) throw new Error("useTheme phải dùng bên trong <ThemeProvider>");
  return v;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const t = readInitialTheme();
    setThemeState(t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("nhai.theme", t);
    } catch {
      /* silent */
    }
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
