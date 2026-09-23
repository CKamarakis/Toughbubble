"use server";

import { UnauthenticatedError, withUserDb } from "@/db/client";
import { parseEditorStyles } from "./editor-styles";
import * as ops from "./operations";
import { parseSavedColors } from "./saved-colors";

export type SettingsResult = { ok: true } | { ok: false; error: string };

async function save(patch: Partial<ops.UserSettings>): Promise<SettingsResult> {
  try {
    await withUserDb((tx) => ops.saveSettings(tx, patch));
    return { ok: true };
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { ok: false, error: "Your session has ended. Please sign in again." };
    }
    console.error("[settings] unexpected error", { message: (error as Error)?.message });
    return { ok: false, error: "Couldn't save your settings. Please try again." };
  }
}

export async function saveEditorStyles(styles: unknown): Promise<SettingsResult> {
  const parsed = parseEditorStyles(styles);
  if (!parsed) return { ok: false, error: "Those editor settings aren't valid." };
  return save({ editorStyles: parsed });
}

export async function saveSavedColors(colors: unknown): Promise<SettingsResult> {
  const parsed = parseSavedColors(colors);
  if (!parsed) return { ok: false, error: "Those saved colors aren't valid." };
  return save({ savedColors: parsed });
}
