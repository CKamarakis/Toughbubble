import { sql } from "drizzle-orm";
import type { UserTx } from "@/db/client";
import { userSettings } from "@/db/schema";
import { readEditorStyles, type EditorStyles } from "./editor-styles";
import { readSavedColors } from "./saved-colors";

export type UserSettings = { editorStyles: EditorStyles; savedColors: string[] };

export const DEFAULT_SETTINGS: UserSettings = { editorStyles: {}, savedColors: [] };

/** The user's settings; defaults when they have never saved any. RLS limits it to their row. */
export async function loadSettings(tx: UserTx): Promise<UserSettings> {
  const [row] = await tx.select().from(userSettings).limit(1);
  if (!row) return DEFAULT_SETTINGS;
  return { editorStyles: readEditorStyles(row.editorStyles), savedColors: readSavedColors(row.savedColors) };
}

/** Creates or updates the user's row with already-validated values. */
export async function saveSettings(tx: UserTx, patch: Partial<UserSettings>) {
  const set = {
    ...(patch.editorStyles !== undefined ? { editorStyles: patch.editorStyles } : {}),
    ...(patch.savedColors !== undefined ? { savedColors: patch.savedColors } : {}),
    updatedAt: sql`now()`,
  };
  await tx
    .insert(userSettings)
    .values({ editorStyles: patch.editorStyles ?? {}, savedColors: patch.savedColors ?? [] })
    .onConflictDoUpdate({ target: userSettings.ownerId, set });
}
