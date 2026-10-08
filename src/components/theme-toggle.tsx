"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const subscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser; render no selection on the server.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current = mounted ? theme : undefined;

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      // The edge, not the fill, carries the 3:1 against light surfaces (shell-hardening D5).
      className={cn("inline-flex gap-0.5 rounded-lg border border-input bg-warm-200 p-0.5 dark:bg-muted", className)}
    >
      {options.map(({ value, label, Icon }) => (
        <Button
          key={value}
          role="radio"
          aria-checked={current === value}
          aria-label={label}
          title={label}
          variant="ghost"
          size="icon-sm"
          className={cn(
            "text-muted-foreground",
            current === value && "bg-background text-foreground shadow-sm ring-1 ring-input",
          )}
          onClick={() => setTheme(value)}
        >
          <Icon />
        </Button>
      ))}
    </div>
  );
}
