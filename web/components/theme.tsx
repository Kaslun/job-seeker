"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const effective = theme === "system" ? (sysDark ? "dark" : "light") : theme;
      root.dataset.theme = effective;
    };
    apply();
    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", apply);
      return () => mql.removeEventListener("change", apply);
    }
  }, [theme]);

  const cycle = () => {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  const label = theme === "system" ? "auto" : theme;
  const icon = theme === "dark" ? "🌙" : theme === "light" ? "☀" : "◐";

  return (
    <button className="theme-toggle" onClick={cycle} title={`Theme: ${label}`}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Inline script to apply theme before paint, avoiding flash.
export const ThemeScript = () => (
  <script
    dangerouslySetInnerHTML={{
      __html: `
        (function() {
          try {
            var t = localStorage.getItem('theme') || 'system';
            var sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            var eff = t === 'system' ? (sysDark ? 'dark' : 'light') : t;
            document.documentElement.dataset.theme = eff;
          } catch (e) {}
        })();
      `,
    }}
  />
);
