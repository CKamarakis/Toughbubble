"use client";

import { ChevronsUpDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useSyncExternalStore } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const subscribe = () => () => {};

/**
 * The account row at the bottom of the sidebar (account-menu D1–D4): the
 * user's initial and email, opening a menu with Settings, the theme and Sign
 * out. Highlighted like a current link while the Settings page is open.
 */
export function AccountMenu({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; mark nothing on the server.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // The menu popup unmounts on close, so the sign-out form lives outside it (D3).
  const signOut = useRef<HTMLFormElement>(null);
  const onSettings = pathname === "/settings";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account menu for ${email}`}
          className={cn(
            "flex h-7 w-full items-center gap-2 rounded-md px-1 text-left text-sm hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:h-10 data-[popup-open]:bg-sidebar-accent",
            onSettings && "bg-sidebar-accent font-medium",
          )}
        >
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-warm-700 text-xs font-medium text-warm-50 dark:bg-warm-300 dark:text-warm-950"
          >
            {email.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate">{email}</span>
          <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="min-w-52">
          <DropdownMenuItem
            aria-current={onSettings ? "page" : undefined}
            onClick={() => router.push("/settings")}
          >
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={mounted ? (theme ?? "system") : null} onValueChange={(v) => setTheme(v)}>
              {THEMES.map(({ value, label, Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut.current?.requestSubmit()}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <form ref={signOut} action="/auth/sign-out" method="post" hidden />
    </>
  );
}
