"use client";

import { useEffect, useRef } from "react";
import { createLongPress } from "@/lib/long-press";

/**
 * Touch long press for a sidebar row (shell-hardening D3). Only touch pointers
 * count; mouse and pen keep click and drag. The click that follows a fired
 * long press is swallowed so the row doesn't also open.
 *
 * `onLongPress` runs just after the finger lifts, not while it is down: a menu
 * opened mid-press would be closed again by that release's click, which the
 * menu sees as a press outside it. A short vibration (where supported) marks
 * the moment the press is recognised.
 */
export function useLongPress(onLongPress: () => void) {
  const callback = useRef(onLongPress);
  useEffect(() => {
    callback.current = onLongPress;
  });
  const ready = useRef(false);
  // Created on first use, outside render.
  const pressRef = useRef<ReturnType<typeof createLongPress> | null>(null);
  const press = () =>
    (pressRef.current ??= createLongPress({
      onLongPress: () => {
        ready.current = true;
        navigator.vibrate?.(10);
      },
    }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      pressRef.current?.end();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const lastPointer = useRef<string | null>(null);

  const release = () => {
    press().end();
    if (!ready.current) return;
    ready.current = false;
    // After the release's click (if the browser sends one) has been swallowed.
    timer.current = setTimeout(() => callback.current(), 80);
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      lastPointer.current = e.pointerType;
      ready.current = false;
      if (e.pointerType === "touch") press().down(e.clientX, e.clientY);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "touch") press().move(e.clientX, e.clientY);
    },
    onPointerUp: release,
    onPointerCancel: release,
    onClickCapture: (e: React.MouseEvent) => {
      if (press().consumeClick()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    // The browser's own long-press menu (Android) would cover ours.
    onContextMenu: (e: React.MouseEvent) => {
      if (lastPointer.current === "touch") e.preventDefault();
    },
  };
}
