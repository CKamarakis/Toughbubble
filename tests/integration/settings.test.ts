import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { userSettings } from "@/db/schema";
import * as settings from "@/lib/settings/operations";
import { createTestUser, deleteTestUser, type TestUser } from "./harness";

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  [user, other] = await Promise.all([createTestUser(), createTestUser()]);
});

afterAll(async () => {
  await Promise.all([user, other].filter(Boolean).map(deleteTestUser));
});

describe("user settings", () => {
  it("returns defaults before anything is saved", async () => {
    expect(await user.run((tx) => settings.loadSettings(tx))).toEqual(settings.DEFAULT_SETTINGS);
  });

  it("creates the row on first save and updates it after", async () => {
    await user.run((tx) => settings.saveSettings(tx, { editorStyles: { h1: { size: 40 } } }));
    await user.run((tx) => settings.saveSettings(tx, { savedColors: ["#1a7f5a"] }));
    expect(await user.run((tx) => settings.loadSettings(tx))).toEqual({
      editorStyles: { h1: { size: 40 } },
      savedColors: ["#1a7f5a"],
    });
    await user.run((tx) =>
      settings.saveSettings(tx, { editorStyles: { h1: { size: 40, light: "#1a2b3c", dark: "#f7d000" } } }),
    );
    expect((await user.run((tx) => settings.loadSettings(tx))).editorStyles).toEqual({
      h1: { size: 40, light: "#1a2b3c", dark: "#f7d000" },
    });
  });

  it("reads a color saved before per-theme colors as both themes", async () => {
    // A row as the previous version wrote it.
    await user.run((tx) =>
      tx.update(userSettings).set({ editorStyles: { h2: { color: "#9c00f7" } } }).where(eq(userSettings.ownerId, user.id)),
    );
    expect((await user.run((tx) => settings.loadSettings(tx))).editorStyles).toEqual({
      h2: { light: "#9c00f7", dark: "#9c00f7" },
    });
  });

  it("resetting an element removes its key", async () => {
    await user.run((tx) => settings.saveSettings(tx, { editorStyles: { h2: { size: 28 } } }));
    await user.run((tx) => settings.saveSettings(tx, { editorStyles: {} }));
    expect((await user.run((tx) => settings.loadSettings(tx))).editorStyles).toEqual({});
  });

  it("is private: another user sees defaults and cannot change it", async () => {
    await user.run((tx) => settings.saveSettings(tx, { savedColors: ["#123456"] }));
    expect(await other.run((tx) => settings.loadSettings(tx))).toEqual(settings.DEFAULT_SETTINGS);
    await other.run((tx) => settings.saveSettings(tx, { savedColors: ["#654321"] })); // writes their own row
    expect((await user.run((tx) => settings.loadSettings(tx))).savedColors).toEqual(["#123456"]);
    expect((await other.run((tx) => settings.loadSettings(tx))).savedColors).toEqual(["#654321"]);
    const rowsVisibleToOther = await other.run((tx) => tx.select().from(userSettings));
    expect(rowsVisibleToOther).toHaveLength(1);
  });

  it("rejects writing a row for someone else", async () => {
    await expect(
      other.run((tx) => tx.insert(userSettings).values({ ownerId: user.id, editorStyles: {} })),
    ).rejects.toThrow();
  });
});
