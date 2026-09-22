"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Inline title editor: Enter or leaving the field saves, Escape cancels.
 * `onDone` is called once either way.
 */
export function TitleInput({
  initial,
  placeholder,
  onSave,
  onDone,
  className,
  autoSelect = true,
  "aria-label": ariaLabel,
}: {
  initial: string;
  placeholder: string;
  onSave: (title: string) => void;
  onDone: () => void;
  className?: string;
  autoSelect?: boolean;
  "aria-label": string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    if (autoSelect) ref.current?.select();
  }, [autoSelect]);

  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const value = ref.current?.value.trim() ?? "";
    if (save && value !== initial.trim()) onSave(value);
    onDone();
  };

  return (
    <input
      ref={ref}
      defaultValue={initial}
      placeholder={placeholder}
      aria-label={ariaLabel}
      maxLength={200}
      className={cn(
        "min-w-0 flex-1 rounded-sm bg-background px-1 outline-none ring-2 ring-ring",
        className,
      )}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      }}
      onBlur={() => finish(true)}
    />
  );
}
