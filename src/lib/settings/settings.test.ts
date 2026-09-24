import { describe, expect, it } from "vitest";
import { contrastRatio, hardToReadIn, parseHexColor } from "@/lib/color";
import {
  editorStyleVariables,
  effectiveSize,
  parseEditorStyles,
  readEditorStyles,
  withElementStyle,
} from "./editor-styles";
import { addSavedColor, MAX_SAVED_COLORS, parseSavedColors, readSavedColors, removeSavedColor } from "./saved-colors";

describe("hex colors", () => {
  it.each([
    ["#1A7F5A", "#1a7f5a"],
    ["1a7f5a", "#1a7f5a"],
    [" #ffffff ", "#ffffff"],
  ])("parses %j", (input, hex) => expect(parseHexColor(input)).toBe(hex));

  it.each([["#12zz99"], ["#fff"], ["#1234567"], ["red"], [""], [null]])("rejects %j", (input) =>
    expect(parseHexColor(input)).toBeNull(),
  );
});

describe("contrast warning", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("names the themes where a color is hard to read", () => {
    expect(hardToReadIn("#0b7f3e")).toEqual(["dark"]); // green: fine on light only
    expect(hardToReadIn("#9c00f7")).toEqual(["dark"]); // brand purple (dark mode uses #c07bff for links)
    expect(hardToReadIn("#ff5cc8")).toEqual(["light"]); // light magenta
    expect(hardToReadIn("#f7d000")).toEqual(["light"]); // yellow on light page
    expect(hardToReadIn("#141310")).toEqual(["dark"]); // near-black on dark page
    expect(hardToReadIn("#8c897d")).toEqual(["light", "dark"]);
  });

  it("checks only one theme for a color used in that theme", () => {
    expect(hardToReadIn("#f7d000", undefined, "dark")).toEqual([]); // yellow as a Dark color: fine
    expect(hardToReadIn("#f7d000", undefined, "light")).toEqual(["light"]);
    expect(hardToReadIn("#141310", undefined, "light")).toEqual([]); // near-black as a Light color: fine
    expect(hardToReadIn("#141310", undefined, "dark")).toEqual(["dark"]);
  });
});

describe("editor styles", () => {
  it("accepts valid styles and lowercases colors", () => {
    expect(parseEditorStyles({ h1: { size: 40, light: "#1A2B3C", dark: "#F7D000" }, p: { size: 18 } })).toEqual({
      h1: { size: 40, light: "#1a2b3c", dark: "#f7d000" },
      p: { size: 18 },
    });
    expect(parseEditorStyles({ h2: { dark: "#f7d000" } })).toEqual({ h2: { dark: "#f7d000" } });
    expect(parseEditorStyles({})).toEqual({});
  });

  it("accepts the old single color from an outdated tab, as both themes", () => {
    expect(parseEditorStyles({ h1: { color: "#9C00F7" } })).toEqual({ h1: { light: "#9c00f7", dark: "#9c00f7" } });
    // Per-theme colors win over the old one.
    expect(parseEditorStyles({ h1: { color: "#9c00f7", dark: "#f7d000" } })).toEqual({
      h1: { light: "#9c00f7", dark: "#f7d000" },
    });
  });

  it.each([
    [{ h7: { size: 20 } }],
    [{ p: { size: 120 } }],
    [{ p: { size: 7 } }],
    [{ p: { size: 16.5 } }],
    [{ p: { color: "purple" } }],
    [{ p: { color: "9c00f7" } }],
    [{ p: { light: "purple" } }],
    [{ p: { dark: "f7d000" } }],
    [{ p: { weight: 700 } }],
    [[]],
    [null],
  ])("rejects %j", (input) => expect(parseEditorStyles(input)).toBeNull());

  it("reads stored data leniently", () => {
    expect(readEditorStyles({ h1: { size: 40, color: "bad" }, junk: 1, p: { size: 500 } })).toEqual({ h1: { size: 40 } });
    expect(readEditorStyles({ h1: { light: "#1a2b3c", dark: "bad" } })).toEqual({ h1: { light: "#1a2b3c" } });
    expect(readEditorStyles(null)).toEqual({});
  });

  it("reads a color saved before per-theme colors as both themes", () => {
    expect(readEditorStyles({ h2: { color: "#9c00f7" } })).toEqual({ h2: { light: "#9c00f7", dark: "#9c00f7" } });
    // Once per-theme colors exist, they win and the old color is ignored.
    expect(readEditorStyles({ h2: { color: "#9c00f7", dark: "#f7d000" } })).toEqual({ h2: { dark: "#f7d000" } });
  });

  it("updates one element and resets by removing the key", () => {
    let s = withElementStyle({}, "h1", { size: 40 });
    s = withElementStyle(s, "h1", { light: "#1a2b3c" });
    s = withElementStyle(s, "h1", { dark: "#f7d000" });
    expect(s).toEqual({ h1: { size: 40, light: "#1a2b3c", dark: "#f7d000" } });
    expect(effectiveSize(s, "h1")).toBe(40);
    expect(effectiveSize(s, "h2")).toBe(30);
    s = withElementStyle(s, "h1", { dark: undefined }); // one theme back to Automatic
    expect(s).toEqual({ h1: { size: 40, light: "#1a2b3c" } });
    s = withElementStyle(s, "h1", { size: 36, light: undefined, dark: undefined }); // back to built-in
    expect(s).toEqual({});
  });

  it("produces CSS variables only for changed elements", () => {
    expect(editorStyleVariables({ h1: { size: 40, light: "#1a2b3c", dark: "#f7d000" }, h3: { dark: "#3dd68c" }, p: { size: 18 } })).toEqual({
      "--tb-h1-size": "40px",
      "--tb-h1-light": "#1a2b3c",
      "--tb-h1-dark": "#f7d000",
      "--tb-h3-dark": "#3dd68c",
      "--tb-p-size": "18px",
    });
  });
});

describe("saved colors", () => {
  it("adds newest first and moves duplicates to the front", () => {
    let list = addSavedColor([], "#111111");
    list = addSavedColor(list, "#222222");
    list = addSavedColor(list, "#111111");
    expect(list).toEqual(["#111111", "#222222"]);
  });

  it("caps the list, dropping the oldest", () => {
    let list: string[] = [];
    for (let i = 0; i < MAX_SAVED_COLORS + 3; i++) list = addSavedColor(list, `#0000${i.toString(16).padStart(2, "0")}`);
    expect(list).toHaveLength(MAX_SAVED_COLORS);
    expect(list[0]).toBe("#000016");
    expect(list).not.toContain("#000000");
  });

  it("removes a color", () => {
    expect(removeSavedColor(["#111111", "#222222"], "#111111")).toEqual(["#222222"]);
  });

  it("validates writes strictly and reads leniently", () => {
    expect(parseSavedColors(["#111111", "#AAAAAA"])).toEqual(["#111111", "#aaaaaa"]);
    expect(parseSavedColors(["#111111", "#111111"])).toBeNull();
    expect(parseSavedColors(["red"])).toBeNull();
    expect(parseSavedColors("x")).toBeNull();
    expect(readSavedColors(["#111111", "bad", "#111111"])).toEqual(["#111111"]);
  });
});
