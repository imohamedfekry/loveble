"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { cn } from "@loveble/utils";

const TRACK = 40;
const TRACK_HEIGHT = 22;
const THUMB = 18;
const PAD = (TRACK_HEIGHT - THUMB) / 2;
const CLOSED_X = PAD;
const OPEN_X = TRACK - THUMB - PAD;

type SettingsToggleProps = SwitchPrimitive.Root.Props & {
  stretch?: number;
  speed?: number;
};

type SwitchChangeDetails = Parameters<
  NonNullable<SwitchPrimitive.Root.Props["onCheckedChange"]>
>[1];
type SwitchPointerEvent = Parameters<
  NonNullable<SwitchPrimitive.Root.Props["onPointerDown"]>
>[0];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function SettingsToggle({
  checked,
  defaultChecked = false,
  onCheckedChange,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onPointerEnter,
  onPointerLeave,
  onClickCapture,
  className,
  stretch = 36,
  speed = 50,
  ...props
}: SettingsToggleProps) {
  const [uncontrolledChecked, setUncontrolledChecked] =
    React.useState(defaultChecked);
  const isChecked = checked ?? uncontrolledChecked;
  const [hot, setHot] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  const prefersReducedMotion = useReducedMotion();
  const rail = React.useRef<HTMLElement>(null);
  const grip = React.useRef<{
    id: number;
    grab: number | null;
    moved: boolean;
  } | null>(null);
  const suppressClick = React.useRef(false);
  // The thumb's velocity drives its shape; there is no separate trailing blob.
  const x = useMotionValue(isChecked ? OPEN_X : CLOSED_X);
  const velocity = useVelocity(x);
  const easedVelocity = useSpring(velocity, {
    stiffness: 380,
    damping: 34,
    mass: 0.6,
  });
  const swell = useMotionValue(1);

  const lengthen = (value: number) =>
    1 +
    Math.min(0.4, Math.abs(value) / 235) *
      (clamp(stretch, 0, 100) / 100);
  // Inverse scaling keeps the droplet's area steady as it stretches.
  const scaleX = useTransform(
    [easedVelocity, swell],
    ([value, size]: number[]) =>
      prefersReducedMotion ? 1 : lengthen(value) * size,
  );
  const scaleY = useTransform(
    [easedVelocity, swell],
    ([value, size]: number[]) =>
      prefersReducedMotion ? 1 : size / lengthen(value),
  );

  const settle = React.useMemo(
    () => ({
      type: "spring" as const,
      stiffness: 170 - (50 - speed) * 1.1,
      damping: 21.5,
      mass: 0.9,
    }),
    [speed],
  );

  const changeChecked = React.useCallback(
    (nextChecked: boolean, eventDetails: SwitchChangeDetails) => {
      if (checked === undefined) setUncontrolledChecked(nextChecked);
      onCheckedChange?.(nextChecked, eventDetails);
    },
    [checked, onCheckedChange],
  );

  React.useEffect(() => {
    if (held) return;

    if (prefersReducedMotion) {
      x.set(isChecked ? OPEN_X : CLOSED_X);
      return;
    }

    const animation = animate(x, isChecked ? OPEN_X : CLOSED_X, settle);
    return () => animation.stop();
  }, [held, isChecked, prefersReducedMotion, settle, x]);

  React.useEffect(() => {
    if (prefersReducedMotion) {
      swell.set(1);
      return;
    }

    const animation = animate(swell, hot ? 1.035 : 1, {
      type: "spring",
      stiffness: 380,
      damping: 34,
      mass: 0.6,
    });
    return () => animation.stop();
  }, [hot, prefersReducedMotion, swell]);

  const localX = (clientX: number) => {
    const element = rail.current;
    if (!element) return 0;
    const bounds = element.getBoundingClientRect();
    const scale = bounds.width / (element.offsetWidth || bounds.width) || 1;
    return (clientX - bounds.left) / scale;
  };

  const handlePointerDown = (event: SwitchPointerEvent) => {
    grip.current = { id: event.pointerId, grab: null, moved: false };
    setHeld(true);
    try {
      rail.current?.setPointerCapture(event.pointerId);
    } catch {
      // The control remains usable if pointer capture is unavailable.
    }
    onPointerDown?.(event);
  };

  const handlePointerMove = (event: SwitchPointerEvent) => {
    const activeGrip = grip.current;
    if (!activeGrip || activeGrip.id !== event.pointerId) {
      onPointerMove?.(event);
      return;
    }

    const at = localX(event.clientX);
    if (activeGrip.grab === null) activeGrip.grab = at - x.get();
    const next = clamp(at - activeGrip.grab, CLOSED_X, OPEN_X);
    if (Math.abs(next - x.get()) > 0.4) activeGrip.moved = true;
    x.set(next);

    const nextChecked = next > (CLOSED_X + OPEN_X) / 2;
    if (nextChecked !== isChecked) {
      changeChecked(nextChecked, {
        reason: "none",
        event: event.nativeEvent,
        cancel: () => {},
        allowPropagation: () => {},
        isCanceled: false,
        isPropagationAllowed: false,
        trigger: event.currentTarget,
      });
    }
    onPointerMove?.(event);
  };

  const finishPointer = (
    event: SwitchPointerEvent,
    cancelled = false,
  ) => {
    const activeGrip = grip.current;
    if (!activeGrip || activeGrip.id !== event.pointerId) return;
    grip.current = null;
    try {
      rail.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }

    if (!cancelled && !activeGrip.moved) {
      changeChecked(!isChecked, {
        reason: "none",
        event: event.nativeEvent,
        cancel: () => {},
        allowPropagation: () => {},
        isCanceled: false,
        isPropagationAllowed: false,
        trigger: event.currentTarget,
      });
    }

    if (!cancelled) {
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    } else if (cancelled) {
      x.set(isChecked ? OPEN_X : CLOSED_X);
    }

    setHeld(false);
  };

  return (
    <SwitchPrimitive.Root
      ref={rail}
      checked={isChecked}
      onCheckedChange={(nextChecked, event) => {
        changeChecked(nextChecked, event);
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => {
        finishPointer(event);
        onPointerUp?.(event);
      }}
      onPointerCancel={(event) => {
        finishPointer(event, true);
        onPointerCancel?.(event);
      }}
      onClickCapture={(event) => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
        onClickCapture?.(event);
      }}
      onPointerEnter={(event) => {
        setHot(true);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        setHot(false);
        onPointerLeave?.(event);
      }}
      data-on={isChecked ? "true" : "false"}
      className={cn(
        "settings-liquid-toggle relative inline-flex shrink-0 items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none absolute inset-0">
        <motion.span
          aria-hidden="true"
          className="settings-liquid-thumb"
          style={{ x, scaleX, scaleY }}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
