"use client";

import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { MoveDialog } from "./move-dialog";
import { Sidebar } from "./sidebar";

/**
 * Sidebar + main pane. Below `md` the sidebar is hidden behind a toggle so
 * everything stays reachable on small screens (no dedicated mobile layout yet).
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The small-screen sidebar stays open only on the page it was opened on, so
  // navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  return (
    <div className="flex h-dvh min-h-0">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-sidebar-border shadow-lg md:static md:z-auto md:block md:h-full md:shadow-none",
          open ? "block" : "hidden",
        )}
      >
        <Sidebar />
      </aside>
      {open && (
        <div
          aria-hidden
          className="fixed inset-0 z-30 bg-foreground/20 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b px-2 py-1 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open sidebar"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <PanelLeft />
          </Button>
        </div>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      <MoveDialog />
      <Toaster position="bottom-right" />
    </div>
  );
}
