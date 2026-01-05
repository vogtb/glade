/**
 * Entity system for Glade. Entities are state objects owned by GladeApp.
 * Handles provide indirect access to entities - they're inert without
 * a context.
 */

import type { GladeContext, GladeEntityContext, GladeReadContext } from "./context.ts";
import type { GladeView } from "./element.ts";
import type { EntityId, FocusId, ScrollHandleId, WindowId } from "./id.ts";
import type { ScrollOffset } from "./scroll.ts";

/**
 * A handle to an entity owned by GladeApp. Handles are inert - they
 * provide no direct access to state. Must be combined with a context to
 * read or update.
 */
export class GladeHandle<T> {
  constructor(readonly id: EntityId) {}

  /**
   * Read entity state immutably.
   */
  read(cx: GladeReadContext): Readonly<T> {
    return cx.readEntity(this);
  }

  /**
   * Update entity state with exclusive access.
   */
  update<R>(cx: GladeContext, f: (state: T, cx: GladeEntityContext<T>) => R): R {
    return cx.updateEntity(this, f);
  }
}

/**
 * A view handle - an entity that can render.
 */
export class GladeViewHandle<V extends GladeView> extends GladeHandle<V> {
  readonly __viewBrand = true;
}

/**
 * Metadata stored alongside each entity.
 */
export interface EntityMeta {
  observers: Set<ObserverHandle>;
  subscribers: Map<string, Set<SubscriberHandle>>;
  dropHandlers: Array<() => void>;
}

/**
 * Callback invoked when an observed entity changes.
 */
export type ObserverCallback = (cx: GladeContext) => void;

/**
 * Callback invoked when an entity emits an event.
 */
export type SubscriberCallback<E> = (event: E, cx: GladeContext) => void;

/**
 * Handle returned when observing an entity. Can be used to stop observing.
 */
export class ObserverHandle {
  constructor(
    readonly id: number,
    readonly observedEntity: EntityId,
    readonly callback: ObserverCallback
  ) {}
}

/**
 * Handle returned when subscribing to entity events. Can be used to
 * unsubscribe.
 */
export class SubscriberHandle {
  constructor(
    readonly id: number,
    readonly emitterEntity: EntityId,
    readonly eventType: string,
    readonly callback: SubscriberCallback<unknown>
  ) {}
}

/**
 * Handle for managing focus state.
 */
export class FocusHandle {
  constructor(
    readonly id: FocusId,
    readonly windowId: WindowId
  ) {}

  /**
   * Check if this focus handle currently has focus.
   */
  isFocused(cx: GladeReadContext): boolean {
    return cx.isFocused(this);
  }

  /**
   * Request focus for this handle.
   */
  focus(cx: GladeContext): void {
    cx.focus(this);
  }

  /**
   * Release focus from this handle.
   */
  blur(cx: GladeContext): void {
    cx.blur(this);
  }

  /**
   * Focus the first focusable child of this handle.
   */
  focusFirstChild(cx: GladeContext): void {
    cx.focusFirstChild(this);
  }

  /**
   * Focus the next focusable sibling of this handle.
   */
  focusNextSibling(cx: GladeContext): void {
    cx.focusNextSibling(this);
  }

  /**
   * Save the current focus in this handle's window.
   */
  saveFocus(cx: GladeContext): void {
    cx.saveFocus(this.windowId);
  }

  /**
   * Restore the most recently saved focus in this handle's window.
   */
  restoreFocus(cx: GladeContext): void {
    cx.restoreFocus(this.windowId);
  }
}

/**
 * Handle for managing scroll state.
 * Provides external control over a scroll container's offset.
 */
export class ScrollHandle {
  constructor(
    readonly id: ScrollHandleId,
    readonly windowId: WindowId
  ) {}

  /**
   * Get the current scroll offset.
   */
  getOffset(cx: GladeReadContext): ScrollOffset {
    return cx.getScrollOffset(this);
  }

  /**
   * Set the scroll offset.
   */
  setOffset(cx: GladeContext, offset: ScrollOffset): void {
    cx.setScrollOffset(this, offset);
  }

  /**
   * Scroll by a delta amount.
   */
  scrollBy(cx: GladeContext, deltaX: number, deltaY: number): void {
    cx.scrollBy(this, deltaX, deltaY);
  }
}
