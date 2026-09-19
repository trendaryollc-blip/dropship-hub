import { createElement, forwardRef } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";

// Minimal framer-motion stub for the vitest suite.
//
// The real framer-motion starts Web Animations that get canceled when
// tests unmount components quickly; happy-dom turns the cancelation into
// an unhandled `AbortError` rejection that destabilizes the run. This
// stub renders plain DOM elements with identical markup so component
// tests exercise structure and logic, not animation timers.

type StubProps = Record<string, unknown> & {
  children?: ReactNode;
  style?: CSSProperties;
};

// Props that only exist on motion components — strip them so React does
// not forward unknown attributes to the DOM.
const MOTION_ONLY_PROPS = new Set([
  "animate",
  "initial",
  "exit",
  "transition",
  "variants",
  "whileHover",
  "whileTap",
  "whileFocus",
  "whileInView",
  "whileDrag",
  "viewport",
  "layout",
  "layoutId",
  "layoutScroll",
  "layoutRoot",
  "drag",
  "dragConstraints",
  "dragElastic",
  "dragMomentum",
  "dragPropagation",
  "onDragStart",
  "onDragEnd",
  "onDrag",
  "custom",
  "onAnimationStart",
  "onAnimationComplete",
]);

const componentCache = new Map<string, ComponentType<StubProps>>();

function createMotionComponent(tag: string): ComponentType<StubProps> {
  const cached = componentCache.get(tag);
  if (cached) return cached;

  const Component = forwardRef<HTMLElement, StubProps>(function MotionStub(
    props,
    ref
  ) {
    const { children, style, ...rest } = props;
    const domProps: Record<string, unknown> = {};
    for (const key of Object.keys(rest)) {
      if (!MOTION_ONLY_PROPS.has(key)) {
        domProps[key] = rest[key];
      }
    }
    return createElement(tag, { ...domProps, ref, style }, children);
  });
  Component.displayName = `motion.${tag}`;
  componentCache.set(tag, Component);
  return Component;
}

export const motion = new Proxy(
  {} as Record<string, ComponentType<StubProps>>,
  {
    get(_target, prop) {
      if (typeof prop !== "string" || prop === "$$typeof") {
        return undefined;
      }
      return createMotionComponent(prop);
    },
  }
);

export function AnimatePresence({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
