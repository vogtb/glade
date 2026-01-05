import type { Bounds } from "./bounds.ts";
import type { GladeContext } from "./context.ts";
import type { FocusHandle, ScrollHandle } from "./entity.ts";
import type { FocusId } from "./id.ts";
import type { Point } from "./point.ts";
import type { GladeWindow } from "./window.ts";

/**
 * Mouse event data.
 */
export interface GladeMouseEvent {
  /** X position relative to window. */
  x: number;
  /** Y position relative to window. */
  y: number;
  /** Mouse button (0=left, 1=right, 2=middle). */
  button: number;
  /** Modifier keys held. */
  modifiers: Modifiers;
}

/**
 * Click event data.
 */
export interface GladeClickEvent {
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
export interface GladeKeyEvent {
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
export interface GladeScrollEvent {
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
 * Text input event data (character input).
 */
export interface GladeTextInputEvent {
  /** Text to insert (may be multiple code points). */
  text: string;
  /** Whether the text originated from an active composition. */
  isComposing: boolean;
}

/**
 * Composition (IME) event data.
 */
export interface GladeCompositionEvent {
  /** Current composition text (empty on start). */
  text: string;
  /** Selection start within the composition text. */
  selectionStart: number;
  /** Selection end within the composition text. */
  selectionEnd: number;
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
  event: GladeMouseEvent,
  window: GladeWindow,
  cx: GladeContext
) => EventResult | void;

/**
 * Click event handler type.
 */
export type ClickHandler = (
  event: GladeClickEvent,
  window: GladeWindow,
  cx: GladeContext
) => EventResult | void;

/**
 * Key event handler type.
 */
export type KeyHandler = (
  event: GladeKeyEvent,
  window: GladeWindow,
  cx: GladeContext
) => EventResult | void;

/**
 * Text input handler type.
 */
export type TextInputHandler = (
  event: GladeTextInputEvent,
  window: GladeWindow,
  cx: GladeContext
) => EventResult | void;

/**
 * Composition event handler type.
 */
export type CompositionHandler = (
  event: GladeCompositionEvent,
  window: GladeWindow,
  cx: GladeContext
) => EventResult | void;

/**
 * Scroll event handler type.
 */
export type ScrollHandler = (
  event: GladeScrollEvent,
  window: GladeWindow,
  cx: GladeContext
) => EventResult | void;

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
  textInput?: TextInputHandler;
  compositionStart?: CompositionHandler;
  compositionUpdate?: CompositionHandler;
  compositionEnd?: CompositionHandler;
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
  /**
   * Allow children to be hit even if they extend outside this node's bounds.
   * */
  allowChildOutsideBounds?: boolean;
  /**
   * If true, this node blocks pointer events from reaching nodes behind it.
   * */
  blocksPointerEvents?: boolean;
}

/**
 * Hit test a point against the tree, returning the path from root to leaf.
 * Roots are expected to be in back-to-front order (main UI first, overlays
 * last). We iterate in reverse (front-to-back) to find the topmost blocking
 * root first. If a blocking root contains the point, we only return its path.
 */
export function hitTest(roots: HitTestNode[], point: Point): HitTestNode[] {
  function walk(node: HitTestNode): HitTestNode[] {
    const { bounds } = node;
    const inside =
      point.x >= bounds.x &&
      point.x < bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y < bounds.y + bounds.height;

    // check children in reverse order (top first)
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (!child) {
        continue;
      }
      const childPath = walk(child);
      if (childPath.length > 0) {
        // if the parent allows out-of-bounds children, keep the parent in
        // the path
        if (inside || node.allowChildOutsideBounds === true) {
          return [node, ...childPath];
        }
        return childPath;
      }
    }

    if (!inside && node.allowChildOutsideBounds !== true) {
      return [];
    }

    if (inside) {
      return [node];
    }

    return [];
  }

  // Check roots in reverse order (front-to-back, since overlays are added last)
  // If a blocking root contains the point, only use its path
  for (let i = roots.length - 1; i >= 0; i--) {
    const root = roots[i]!;
    const path = walk(root);
    if (root.blocksPointerEvents && path.length > 0) {
      return path;
    }
  }

  // No blocking root contains the point, walk all roots
  const path: HitTestNode[] = [];
  for (const root of roots) {
    const rootPath = walk(root);
    path.push(...rootPath);
  }

  return path;
}

/**
 * Dispatch a mouse event through the hit test path.
 */
export function dispatchMouseEvent(
  type: keyof Pick<EventHandlers, "mouseDown" | "mouseUp" | "mouseMove">,
  event: GladeMouseEvent,
  path: HitTestNode[],
  window: GladeWindow,
  cx: GladeContext
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
  event: GladeClickEvent,
  path: HitTestNode[],
  window: GladeWindow,
  cx: GladeContext
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
  event: GladeKeyEvent,
  path: HitTestNode[],
  window: GladeWindow,
  cx: GladeContext
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
 * Dispatch a text input event through the focus chain.
 */
export function dispatchTextInputEvent(
  event: GladeTextInputEvent,
  path: HitTestNode[],
  window: GladeWindow,
  cx: GladeContext
): void {
  for (let i = path.length - 1; i >= 0; i--) {
    const node = path[i]!;
    const handler = node.handlers.textInput;
    if (handler) {
      const result = handler(event, window, cx);
      if (result?.stopPropagation) {
        return;
      }
    }
  }
}

/**
 * Dispatch a composition event through the focus chain.
 */
export function dispatchCompositionEvent(
  type: "compositionStart" | "compositionUpdate" | "compositionEnd",
  event: GladeCompositionEvent,
  path: HitTestNode[],
  window: GladeWindow,
  cx: GladeContext
): void {
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
 * Dispatch a scroll event through the hit test path. First tries custom
 * scroll handlers, then applies to scroll containers. (One _can_ override
 * another.)
 */
export function dispatchScrollEvent(
  event: GladeScrollEvent,
  path: HitTestNode[],
  window: GladeWindow,
  cx: GladeContext
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
 * Build the key context chain from a hit test path. Collects all keyContext
 * values from nodes, ordered from root to leaf. This determines which
 * context-specific key bindings are active.
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
 * Get the focused path from the hit test tree. Returns the path to the
 * element that owns the given focus ID.
 */
export function getFocusedPath(roots: HitTestNode[], focusId: FocusId | null): HitTestNode[] {
  const path: HitTestNode[] = [];

  function walk(node: HitTestNode): boolean {
    path.push(node);

    if (node.focusHandle?.id === focusId) {
      return true;
    }

    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i];
      if (child && walk(child)) {
        return true;
      }
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
