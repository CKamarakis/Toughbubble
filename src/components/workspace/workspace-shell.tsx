"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { PanelLeft, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { topBarTitle } from "@/lib/tree/shell";
import { MoveDialog } from "./move-dialog";
import { Sidebar } from "./sidebar";
import { useWorkspace } from "./workspace-context";

const WIDE = "(min-width: 768px)";

/**
 * Sidebar + main pane. From `md` up the sidebar sits beside the page; below it
 * the sidebar opens as a modal side panel from the top bar (shell-hardening D2),
 * which traps focus, makes the page inert, and closes with Escape.
 */
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const ws = useWorkspace();
  const pathname = usePathname();
  // The small-screen sidebar stays open only on the page it was opened on, so
  // navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);

  // Growing the window past the breakpoint shows the static sidebar; close the
  // panel so the sidebar is never shown twice.
  useEffect(() => {
    if (!open) return;
    const wide = window.matchMedia(WIDE);
    const close = () => wide.matches && setOpenOn(null);
    close();
    wide.addEventListener("change", close);
    return () => wide.removeEventListener("change", close);
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* While the panel is open the page behind is inert, so screen readers
          can't browse it either; the panel itself is portaled outside. */}
      <div className="flex h-dvh min-h-0" inert={open}>
        <aside aria-label="Sidebar" className="hidden h-full w-64 shrink-0 border-r border-sidebar-border md:block">
          <Sidebar />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1 border-b px-2 py-1 md:hidden">
            <DialogPrimitive.Trigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Open sidebar" className="pointer-coarse:size-11" />}
            >
              <PanelLeft />
            </DialogPrimitive.Trigger>
            <span className="truncate text-sm font-medium">{topBarTitle(pathname, ws.rows)}</span>
          </div>
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>

        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-warm-950/30 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none md:hidden" />
          <DialogPrimitive.Popup
            aria-label="Sidebar"
            aria-modal="true"
            className="fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] border-r border-sidebar-border shadow-lg outline-none duration-150 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left motion-reduce:animate-none md:hidden"
          >
            <Sidebar
              closeButton={
                <DialogPrimitive.Close
                  render={<Button variant="ghost" size="icon-sm" aria-label="Close sidebar" className="pointer-coarse:size-11" />}
                >
                  <X />
                </DialogPrimitive.Close>
              }
            />
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>

        <MoveDialog />
        <Toaster position="bottom-right" />
      </div>
    </DialogPrimitive.Root>
  );
}
