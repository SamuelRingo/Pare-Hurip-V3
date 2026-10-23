"use client";

import * as React from "react";

const STORAGE_KEY = "theme";

type Theme = "light" | "dark";

interface ThemeContextValue {
  resolvedTheme: Theme;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

/** Auto dark between 18:00 and 06:00 local time. */
function isDarkHour(date: Date) {
  const hour = date.getHours();
  return hour >= 18 || hour < 6;
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

const THEME_COOKIE = "theme=; path=/; max-age=31536000; SameSite=Lax";

function setThemeCookie(theme: Theme) {
  if (typeof window === "undefined") return;
  document.cookie = `theme=${theme}; ${THEME_COOKIE}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start "light" so SSR and the first client render match; the real
  // theme is applied in a mount effect (the inline anti-FOUC script already
  // toggles the `dark` class on <html> before hydration).
  const [resolvedTheme, setResolvedTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    const stored = getStoredTheme();
    const next = stored ?? (isDarkHour(new Date()) ? "dark" : "light");
    setResolvedTheme(next);
    setThemeCookie(next);
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  // Re-evaluate the time-based theme every minute while no manual override is set.
  React.useEffect(() => {
    if (getStoredTheme()) return;

    const handle = window.setInterval(() => {
      const next = isDarkHour(new Date()) ? "dark" : "light";
      setResolvedTheme(next);
      setThemeCookie(next);
    }, 60_000);

    return () => window.clearInterval(handle);
  }, []);

  const toggle = React.useCallback(() => {
    setResolvedTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, next);
      setThemeCookie(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ resolvedTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
