"use client";

import { create } from "zustand";

export type Theme = "dark" | "light";

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("cv-theme", theme);
  } catch {}
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: "dark",

  setTheme: (t) => {
    set({ theme: t });
    applyTheme(t);
  },

  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    set({ theme: next });
    applyTheme(next);
  },

  initTheme: () => {
    let saved: Theme = "dark";
    try {
      const stored = localStorage.getItem("cv-theme");
      if (stored === "light" || stored === "dark") saved = stored;
    } catch {}
    set({ theme: saved });
    applyTheme(saved);
  },
}));
