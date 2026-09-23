// Preset colors for the shared color picker (design D10), all from the app's
// palette. Order is the grid order: two rows of five, with Automatic (where
// allowed) as the tenth slot.
export const PRESET_COLORS = [
  { name: "Black", hex: "#141310" },
  { name: "White", hex: "#ffffff" },
  { name: "Yellow", hex: "#f7d000" },
  { name: "Red", hex: "#d92d20" },
  { name: "Pink", hex: "#f700a8" },
  { name: "Purple", hex: "#9c00f7" },
  { name: "Blue", hex: "#1d5fd1" },
  { name: "Light blue", hex: "#6ea8ff" },
  { name: "Green", hex: "#0b7f3e" },
] as const;

/** Light swatches that need a border to stay visible on a light popover. */
export const NEEDS_OUTLINE = new Set(["#ffffff", "#f7d000"]);
