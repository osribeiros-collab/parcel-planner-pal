export type ThemePreset = {
  id: string;
  name: string;
  primary: string;
  accent: string;
  secondary: string;
  background: string;
  border: string;
};

export const THEMES: ThemePreset[] = [
  {
    id: "amber",
    name: "Âmbar (padrão)",
    primary: "oklch(0.78 0.15 85)",
    accent: "oklch(0.78 0.15 85)",
    secondary: "oklch(0.25 0.02 85)",
    background: "oklch(0.14 0.005 90)",
    border: "oklch(0.3 0.04 85)",
  },
  {
    id: "forest",
    name: "Floresta",
    primary: "oklch(0.72 0.18 145)",
    accent: "oklch(0.72 0.18 145)",
    secondary: "oklch(0.25 0.04 145)",
    background: "oklch(0.14 0.01 145)",
    border: "oklch(0.32 0.06 145)",
  },
  {
    id: "ocean",
    name: "Oceano",
    primary: "oklch(0.7 0.16 230)",
    accent: "oklch(0.7 0.16 230)",
    secondary: "oklch(0.25 0.04 230)",
    background: "oklch(0.14 0.01 230)",
    border: "oklch(0.32 0.06 230)",
  },
  {
    id: "sunset",
    name: "Pôr do Sol",
    primary: "oklch(0.72 0.2 35)",
    accent: "oklch(0.78 0.18 60)",
    secondary: "oklch(0.27 0.06 35)",
    background: "oklch(0.15 0.02 35)",
    border: "oklch(0.34 0.08 35)",
  },
  {
    id: "violet",
    name: "Violeta",
    primary: "oklch(0.72 0.18 300)",
    accent: "oklch(0.72 0.18 300)",
    secondary: "oklch(0.26 0.05 300)",
    background: "oklch(0.14 0.015 300)",
    border: "oklch(0.32 0.07 300)",
  },
  {
    id: "tropical",
    name: "Tropical",
    primary: "oklch(0.78 0.18 180)",
    accent: "oklch(0.78 0.18 60)",
    secondary: "oklch(0.27 0.06 180)",
    background: "oklch(0.15 0.02 180)",
    border: "oklch(0.34 0.08 180)",
  },
  {
    id: "light",
    name: "Claro",
    primary: "oklch(0.55 0.18 145)",
    accent: "oklch(0.55 0.18 145)",
    secondary: "oklch(0.92 0.02 145)",
    background: "oklch(0.98 0.005 145)",
    border: "oklch(0.85 0.03 145)",
  },
];

const KEY = "ribeiro_theme";

export function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  const r = document.documentElement.style;
  r.setProperty("--primary", t.primary);
  r.setProperty("--accent", t.accent);
  r.setProperty("--ring", t.primary);
  r.setProperty("--secondary", t.secondary);
  r.setProperty("--background", t.background);
  r.setProperty("--border", t.border);
  r.setProperty("--input", t.secondary);
  if (t.id === "light") {
    r.setProperty("--foreground", "oklch(0.2 0.02 145)");
    r.setProperty("--card", "oklch(0.96 0.01 145)");
    r.setProperty("--card-foreground", "oklch(0.2 0.02 145)");
    r.setProperty("--popover", "oklch(0.96 0.01 145)");
    r.setProperty("--popover-foreground", "oklch(0.2 0.02 145)");
    r.setProperty("--muted", "oklch(0.92 0.02 145)");
    r.setProperty("--muted-foreground", "oklch(0.45 0.04 145)");
    r.setProperty("--primary-foreground", "oklch(0.98 0.005 145)");
  } else {
    r.removeProperty("--foreground");
    r.removeProperty("--card");
    r.removeProperty("--card-foreground");
    r.removeProperty("--popover");
    r.removeProperty("--popover-foreground");
    r.removeProperty("--muted");
    r.removeProperty("--muted-foreground");
    r.removeProperty("--primary-foreground");
  }
}

export function loadTheme() {
  if (typeof window === "undefined") return;
  const id = localStorage.getItem(KEY) || "amber";
  applyTheme(id);
}

export function setTheme(id: string) {
  localStorage.setItem(KEY, id);
  applyTheme(id);
}

export function getThemeId(): string {
  if (typeof window === "undefined") return "amber";
  return localStorage.getItem(KEY) || "amber";
}
