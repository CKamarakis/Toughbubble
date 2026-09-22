// Project icon and color presets (design D8). Stored by name in items.icon /
// items.color; unknown or null values fall back to the default look.

export const PROJECT_ICONS = [
  "folder-kanban",
  "briefcase",
  "rocket",
  "book-open",
  "lightbulb",
  "target",
  "heart",
  "star",
  "house",
  "graduation-cap",
  "code",
  "palette",
  "music",
  "camera",
  "plane",
  "flag",
] as const;
export type ProjectIcon = (typeof PROJECT_ICONS)[number];

// Each color meets 3:1 against the sidebar background in its theme
// (light #f5f4f2, dark #22211b): icons are non-text UI (WCAG 1.4.11).
export const PROJECT_COLORS = {
  yellow: { label: "Yellow", light: "#8a6d00", dark: "#f7d000" },
  magenta: { label: "Magenta", light: "#c4007f", dark: "#ff5cc8" },
  purple: { label: "Purple", light: "#9c00f7", dark: "#c07bff" },
  green: { label: "Green", light: "#0b7f3e", dark: "#3dd68c" },
  amber: { label: "Amber", light: "#a65a00", dark: "#ffa23d" },
  blue: { label: "Blue", light: "#1d5fd1", dark: "#6ea8ff" },
  red: { label: "Red", light: "#d92d20", dark: "#ff6b5e" },
} as const;
export type ProjectColor = keyof typeof PROJECT_COLORS;

export const isProjectIcon = (v: unknown): v is ProjectIcon =>
  PROJECT_ICONS.includes(v as ProjectIcon);
export const isProjectColor = (v: unknown): v is ProjectColor =>
  typeof v === "string" && Object.hasOwn(PROJECT_COLORS, v);
