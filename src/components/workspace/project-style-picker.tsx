"use client";

import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { PROJECT_COLORS, PROJECT_ICONS, type ProjectColor } from "@/lib/tree/style";
import type { TreeRow } from "@/lib/tree/types";
import { PROJECT_ICON_COMPONENTS } from "./item-icon";
import { useWorkspace } from "./workspace-context";

/** Icon and color presets for a project (design D8). */
export function ProjectStylePicker({ item }: { item: TreeRow }) {
  const ws = useWorkspace();
  const colors = Object.entries(PROJECT_COLORS) as [ProjectColor, (typeof PROJECT_COLORS)[ProjectColor]][];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <Palette />
        Style
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Color</DropdownMenuLabel>
          <div className="grid grid-cols-8 gap-1 p-1">
            <DropdownMenuItem
              aria-label="Default color"
              closeOnClick={false}
              onClick={() => ws.setStyle(item.id, item.icon, null)}
              className="flex size-7 items-center justify-center p-0"
            >
              <span className="size-4 rounded-full border-2 border-muted-foreground" />
              {!item.color && <Check className="absolute size-3" />}
            </DropdownMenuItem>
            {colors.map(([name, c]) => (
              <DropdownMenuItem
                key={name}
                aria-label={c.label}
                closeOnClick={false}
                onClick={() => ws.setStyle(item.id, item.icon, name)}
                className="flex size-7 items-center justify-center p-0"
              >
                <span
                  className="flex size-4 items-center justify-center rounded-full bg-(--swatch)"
                  style={{ "--swatch": `var(--project-${name})` } as React.CSSProperties}
                >
                  {item.color === name && <Check className="size-3 text-background" />}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Icon</DropdownMenuLabel>
          <div className="grid grid-cols-8 gap-1 p-1">
            {PROJECT_ICONS.map((name) => {
              const Icon = PROJECT_ICON_COMPONENTS[name];
              const selected = item.icon === name || (!item.icon && name === "folder-kanban");
              return (
                <DropdownMenuItem
                  key={name}
                  aria-label={name.replace(/-/g, " ")}
                  closeOnClick={false}
                  onClick={() => ws.setStyle(item.id, name === "folder-kanban" ? null : name, item.color)}
                  className={cn("flex size-7 items-center justify-center p-0", selected && "bg-accent")}
                >
                  <Icon />
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
