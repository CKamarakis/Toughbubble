import { describe, expect, it } from "vitest";
import { assetNamer, exportName } from "./export-names";

describe("exportName", () => {
  it("keeps an ordinary title", () => {
    expect(exportName("Trip plan")).toBe("Trip plan");
  });

  it("removes slashes and other reserved characters", () => {
    expect(exportName('Q3/Q4 plan: "draft" <v2>?*|\\')).toBe("Q3Q4 plan draft v2");
  });

  it("removes trailing dots and spaces", () => {
    expect(exportName("Notes...  ")).toBe("Notes");
  });

  it("caps the length at 100 characters", () => {
    expect(exportName("a".repeat(300))).toHaveLength(100);
  });

  it("uses Untitled for an empty or unusable title", () => {
    expect(exportName("")).toBe("Untitled");
    expect(exportName("  /// ")).toBe("Untitled");
  });
});

describe("assetNamer", () => {
  it("keeps unique names and suffixes repeats before the extension", () => {
    const name = assetNamer();
    expect(name("photo.png")).toBe("photo.png");
    expect(name("photo.png")).toBe("photo-2.png");
    expect(name("photo.png")).toBe("photo-3.png");
    expect(name("other.png")).toBe("other.png");
  });

  it("treats names that differ only in case as the same", () => {
    const name = assetNamer();
    expect(name("Photo.PNG")).toBe("Photo.PNG");
    expect(name("photo.png")).toBe("photo-2.png");
  });

  it("handles names without an extension and unusable names", () => {
    const name = assetNamer();
    expect(name("README")).toBe("README");
    expect(name("README")).toBe("README-2");
    expect(name("a/b:c.txt")).toBe("abc.txt");
    expect(name("")).toBe("file");
  });
});
