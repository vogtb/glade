/**
 * Entity system for Flash.
 *
 * Entities are state objects owned by FlashApp. Handles provide indirect
 * access to entities - they're inert without a context.
 */

import type { EntityId, FocusId, WindowId, ScrollHandleId, ScrollOffset } from "./types.ts";
import type { FlashReadContext, FlashContext, FlashEntityContext } from "./context.ts";
import type { FlashView } from "./element.ts";

/**
 * A handle to an entity owned by FlashApp.
 * Handles are inert - they provide no direct access to state.
 * Must be combined with a context to read or update.
 */
export class FlashHandle<T> {
  constructor(readonly id: EntityId) {}

  /**
   * Read entity state immutably.
   */
  read(cx: FlashReadContext): Readonly<T> {
    return cx.readEntity(this);
  }

  /**
   * Update entity state with exclusive access.
   */
  update<R>(cx: FlashContext, f: (state: T, cx: FlashEntityContext<T>) => R): R {
    return cx.updateEntity(this, f);
  }
}

/**
 * A view handle - an entity that can render.
 */
export class FlashViewHandle<V extends FlashView> extends FlashHandle<V> {
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
export type ObserverCallback = (cx: FlashContext) => void;

/**
 * Callback invoked when an entity emits an event.
 */
export type SubscriberCallback<E> = (event: E, cx: FlashContext) => void;

/**
 * Handle returned when observing an entity.
 * Can be used to stop observing.
 */
export class ObserverHandle {
  constructor(
    readonly id: number,
    readonly observedEntity: EntityId,
    readonly callback: ObserverCallback
  ) {}
}

/**
 * Handle returned when subscribing to entity events.
 * Can be used to unsubscribe.
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
  isFocused(cx: FlashReadContext): boolean {
    return cx.isFocused(this);
  }

  /**
   * Request focus for this handle.
   */
  focus(cx: FlashContext): void {
    cx.focus(this);
  }

  /**
   * Release focus from this handle.
   */
  blur(cx: FlashContext): void {
    cx.blur(this);
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
  getOffset(cx: FlashReadContext): ScrollOffset {
    return cx.getScrollOffset(this);
  }

  /**
   * Set the scroll offset.
   */
  setOffset(cx: FlashContext, offset: ScrollOffset): void {
    cx.setScrollOffset(this, offset);
  }

  /**
   * Scroll by a delta amount.
   */
  scrollBy(cx: FlashContext, deltaX: number, deltaY: number): void {
    cx.scrollBy(this, deltaX, deltaY);
  }
}
