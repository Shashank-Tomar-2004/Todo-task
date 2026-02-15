"use client";

import { useEffect, useState } from "react";
import { applyTheme, type Theme } from "@/lib/theme";

function getActiveTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getActiveTheme());
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="group relative h-9 w-9 rounded-full border border-[var(--border)] bg-[var(--panel-soft)] transition hover:border-[var(--brand)]"
    >
      <span
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm transition duration-300 ${
          theme === "dark" ? "rotate-180 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      >
        ☀
      </span>
      <span
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm transition duration-300 ${
          theme === "dark" ? "rotate-0 scale-100 opacity-100" : "-rotate-180 scale-0 opacity-0"
        }`}
      >
        ☾
      </span>
    </button>
  );
}
