/**
 * Event dispatch system for Flash.
 *
 * Handles mouse, keyboard, and focus events with capture/bubble phases.
 */

import type { Bounds, Point } from "./types.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";
import type { FlashContext } from "./context.ts";
import type { FlashWindow } from "./window.ts";
import type { DragPayload, DropHandler, CanDropPredicate } from "./drag.ts";

/**
 * Mouse event data.
 */
export interface FlashMouseEvent {
  /** X position relative to window. */
  x: number;
  /** Y position relative to window. */
  y: number;
  /** Mouse button (0=left, 1=middle, 2=right). */
  button: number;
  /** Modifier keys held. */
  modifiers: Modifiers;
}

/**
 * Click event data.
 */
export interface FlashClickEvent {
  /** X position relative to window. */
  x: number;
  /** Y position relative to window. */
  y: number;
  /** Number of clicks (1=single, 2=double, etc). */
  clickCount: number;
  /** Modifier keys held. */
  modifiers: Modifiers;
}

/**
 * Keyboard event data.
 */
export interface FlashKeyEvent {
  /** Key code. */
  key: string;
  /** Physical key code. */
  code: string;
  /** Modifier keys held. */
  modifiers: Modifiers;
  /** Whether this is a repeat event. */
  repeat: boolean;
}

/**
 * Scroll/wheel event data.
 */
export interface FlashScrollEvent {
  /** X position relative to window. */
  x: number;
  /** Y position relative to window. */
  y: number;
  /** Horizontal scroll delta. */
  deltaX: number;
  /** Vertical scroll delta. */
  deltaY: number;
  /** Modifier keys held. */
  modifiers: Modifiers;
}

/**
 * Modifier key state.
 */
export interface Modifiers {
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}

/**
 * Event handler result.
 */
export interface EventResult {
  /** Stop propagation to parent elements. */
  stopPropagation?: boolean;
  /** Prevent default browser behavior. */
  preventDefault?: boolean;
}

/**
 * Mouse event handler type.
 */
export type MouseHandler = (
  event: FlashMouseEvent,
  window: FlashWindow,
  cx: FlashContext
) => EventResult | void;

/**
 * Click event handler type.
 */
export type ClickHandler = (
  event: FlashClickEvent,
  window: FlashWindow,
  cx: FlashContext
) => EventResult | void;

/**
 * Key event handler type.
 */
export type KeyHandler = (
  event: FlashKeyEvent,
  window: FlashWindow,
  cx: FlashContext
) => EventResult | void;

/**
 * Scroll event handler type.
 */
export type ScrollHandler = (
  event: FlashScrollEvent,
  window: FlashWindow,
  cx: FlashContext
) => EventResult | void;

/**
 * Handler that starts a drag operation.
 * Returns the drag payload if drag should start, null otherwise.
 */
export type DragStartHandler<T = unknown> = (
  event: FlashMouseEvent,
  window: FlashWindow,
  cx: FlashContext
) => DragPayload<T> | null;

/**
 * Event handlers that can be attached to elements.
 */
export interface EventHandlers {
  mouseDown?: MouseHandler;
  mouseUp?: MouseHandler;
  mouseMove?: MouseHandler;
  mouseEnter?: MouseHandler;
  mouseLeave?: MouseHandler;
  click?: ClickHandler;
  scroll?: ScrollHandler;
  keyDown?: KeyHandler;
  keyUp?: KeyHandler;
  dragStart?: DragStartHandler;
  drop?: DropHandler;
  canDrop?: CanDropPredicate;
}

/**
 * Node in the hit test tree, built during paint.
 */
export interface HitTestNode {
  bounds: Bounds;
  handlers: EventHandlers;
  focusHandle: FocusHandle | null;
  scrollHandle: ScrollHandle | null;
  keyContext: string | null;
  children: HitTestNode[];
}

/**
 * Hit test a point against the tree, returning the path from root to leaf.
 */
export function hitTest(roots: HitTestNode[], point: Point): HitTestNode[] {
  const path: HitTestNode[] = [];

  function walk(node: HitTestNode): boolean {
    const { bounds } = node;
    const inside =
      point.x >= bounds.x &&
      point.x < bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y < bounds.y + bounds.height;

    if (!inside) {
      return false;
    }

    path.push(node);

    // Check children in reverse order (top-most first)
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child && walk(child)) {
        return true;
      }
    }

    return true;
  }

  for (const root of roots) {
    walk(root);
  }

  return path;
}

/**
 * Dispatch a mouse event through the hit test path.
 */
export function dispatchMouseEvent(
  type: keyof Pick<EventHandlers, "mouseDown" | "mouseUp" | "mouseMove">,
  event: FlashMouseEvent,
  path: HitTestNode[],
  window: FlashWindow,
  cx: FlashContext
): void {
  // Bubble phase (target to root)
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!;
    const handler = node.handlers[type];
    if (handler) {
      const result = handler(event, window, cx);
      if (result?.stopPropagation) {
        return;
      }
    }
  }
}

/**
 * Dispatch a click event through the hit test path.
 */
export function dispatchClickEvent(
  event: FlashClickEvent,
  path: HitTestNode[],
  window: FlashWindow,
  cx: FlashContext
): void {
  // Bubble phase (target to root)
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!;
    const handler = node.handlers.click;
    if (handler) {
      const result = handler(event, window, cx);
      if (result?.stopPropagation) {
        return;
      }
    }
  }
}

/**
 * Dispatch a key event through the focus chain.
 */
export function dispatchKeyEvent(
  type: "keyDown" | "keyUp",
  event: FlashKeyEvent,
  path: HitTestNode[],
  window: FlashWindow,
  cx: FlashContext
): void {
  // Bubble phase through focused elements
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!;
    const handler = node.handlers[type];
    if (handler) {
      const result = handler(event, window, cx);
      if (result?.stopPropagation) {
        return;
      }
    }
  }
}

/**
 * Dispatch a scroll event through the hit test path.
 * First tries custom scroll handlers, then applies to scroll containers.
 */
export function dispatchScrollEvent(
  event: FlashScrollEvent,
  path: HitTestNode[],
  window: FlashWindow,
  cx: FlashContext
): void {
  // Bubble phase (target to root)
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!;

    // First try custom scroll handler
    const handler = node.handlers.scroll;
    if (handler) {
      const result = handler(event, window, cx);
      if (result?.stopPropagation) {
        return;
      }
    }

    // If this node has a scroll handle, apply scroll to it
    if (node.scrollHandle) {
      cx.scrollBy(node.scrollHandle, event.deltaX, event.deltaY);
      return;
    }
  }
}

/**
 * Build the key context chain from a hit test path.
 * Collects all keyContext values from nodes, ordered from root to leaf.
 * This determines which context-specific key bindings are active.
 */
export function buildKeyContextChain(path: HitTestNode[]): string[] {
  const contexts: string[] = [];
  for (const node of path) {
    if (node.keyContext) {
      contexts.push(node.keyContext);
    }
  }
  return contexts;
}

/**
 * Get the focused path from the hit test tree.
 * Returns the path to the deepest focused element.
 */
export function getFocusedPath(roots: HitTestNode[]): HitTestNode[] {
  const path: HitTestNode[] = [];

  function walk(node: HitTestNode): boolean {
    path.push(node);

    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child?.focusHandle) {
        if (walk(child)) {
          return true;
        }
      }
    }

    if (node.focusHandle) {
      return true;
    }

    path.pop();
    return false;
  }

  for (const root of roots) {
    if (walk(root)) {
      return path;
    }
  }

  return [];
}
