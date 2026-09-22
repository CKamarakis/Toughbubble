"use client";

import { NewItemMenu } from "./new-item-menu";
import { useWorkspace } from "./workspace-context";

export function HomeView() {
  const ws = useWorkspace();
  const empty = ws.rows.length === 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
      <h1 className="text-xl font-semibold">
        {empty ? "Your workspace is empty" : "Welcome back"}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {empty
          ? "Create a project, folder, note, or Storm to get started."
          : "Pick an item in the sidebar, or create something new."}
      </p>
      <NewItemMenu label={empty ? "Create your first item" : "New"} size="default" />
    </div>
  );
}
