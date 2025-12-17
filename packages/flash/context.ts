/**
 * Context hierarchy for Flash.
 *
 * Contexts provide access to app functionality. Different context types
 * are available in different situations (reading, updating, rendering).
 */

import type { EntityId, FocusId, WindowId, FlashTask, ScrollOffset, Bounds } from "./types.ts";
import type {
  FlashHandle,
  FlashViewHandle,
  FocusHandle,
  ScrollHandle,
  ObserverHandle,
  SubscriberHandle,
} from "./entity.ts";
import type { FlashView } from "./element.ts";
import type { FlashWindow } from "./window.ts";

/**
 * Effect types that are queued and processed after the current update completes.
 */
export type FlashEffect =
  | { type: "notify"; entityId: EntityId }
  | { type: "emit"; entityId: EntityId; eventType: string; event: unknown }
  | { type: "focus"; focusId: FocusId; windowId: WindowId }
  | { type: "blur"; focusId: FocusId; windowId: WindowId }
  | { type: "release"; entityId: EntityId }
  | { type: "callback"; callback: () => void };

/**
 * Read-only context - can read entity state but not modify.
 */
export interface FlashReadContext {
  /**
   * Read an entity's state immutably.
   */
  readEntity<T>(handle: FlashHandle<T>): Readonly<T>;

  /**
   * Check if a focus handle currently has focus.
   */
  isFocused(handle: FocusHandle): boolean;

  /**
   * Get the current scroll offset for a scroll handle.
   */
  getScrollOffset(handle: ScrollHandle): ScrollOffset;

  /**
   * Get the viewport bounds for a scroll handle in window coordinates.
   */
  getScrollViewport(handle: ScrollHandle): Bounds;
}

/**
 * Full context - can read, update, create entities, queue effects.
 */
export interface FlashContext extends FlashReadContext {
  // Entity management

  /**
   * Create a new entity with the given initializer.
   */
  newEntity<T>(initializer: (cx: FlashEntityContext<T>) => T): FlashHandle<T>;

  /**
   * Create a new view entity.
   */
  newView<V extends FlashView>(initializer: (cx: FlashEntityContext<V>) => V): FlashViewHandle<V>;

  /**
   * Update an entity with exclusive access.
   */
  updateEntity<T, R>(handle: FlashHandle<T>, f: (state: T, cx: FlashEntityContext<T>) => R): R;

  // Observations

  /**
   * Observe an entity - callback is invoked when entity calls notify().
   */
  observe<T>(
    handle: FlashHandle<T>,
    callback: (observed: Readonly<T>, cx: FlashContext) => void
  ): ObserverHandle;

  /**
   * Subscribe to typed events from an entity.
   */
  subscribe<T, E>(
    handle: FlashHandle<T>,
    eventType: string,
    callback: (event: E, cx: FlashContext) => void
  ): SubscriberHandle;

  // Focus

  /**
   * Request focus for a handle.
   */
  focus(handle: FocusHandle): void;

  /**
   * Release focus from a handle.
   */
  blur(handle: FocusHandle): void;

  /**
   * Create a new focus handle for a window.
   */
  newFocusHandle(windowId: WindowId): FocusHandle;

  /**
   * Focus the first focusable descendant of a handle.
   */
  focusFirstChild(handle: FocusHandle): void;

  /**
   * Focus the next focusable sibling of a handle.
   */
  focusNextSibling(handle: FocusHandle): void;

  /**
   * Save the current focused handle for a window (for modal restoration).
   */
  saveFocus(windowId: WindowId): void;

  /**
   * Restore the most recently saved focus for a window.
   */
  restoreFocus(windowId: WindowId): void;

  // Scroll

  /**
   * Create a new scroll handle for a window.
   */
  newScrollHandle(windowId: WindowId): ScrollHandle;

  /**
   * Set the scroll offset for a scroll handle.
   */
  setScrollOffset(handle: ScrollHandle, offset: ScrollOffset): void;

  /**
   * Scroll by a delta amount.
   */
  scrollBy(handle: ScrollHandle, deltaX: number, deltaY: number): void;

  // Async

  /**
   * Spawn an async task.
   */
  spawn<T>(future: Promise<T>): FlashTask<T>;

  // Window

  /**
   * Mark a window as needing repaint.
   */
  markWindowDirty(windowId: WindowId): void;
}

/**
 * Context available within an entity update callback.
 * Has access to the entity being updated.
 */
export interface FlashEntityContext<_T> extends FlashContext {
  readonly entityId: EntityId;

  /**
   * Mark this entity as needing to notify observers.
   * For views, this triggers a re-render.
   */
  notify(): void;

  /**
   * Emit a typed event to subscribers.
   */
  emit<E>(eventType: string, event: E): void;

  /**
   * Register a callback to run when this entity is dropped.
   */
  onDrop(callback: () => void): void;
}

/**
 * Context available during view rendering.
 */
export interface FlashViewContext<V extends FlashView> extends FlashEntityContext<V> {
  readonly windowId: WindowId;
  readonly window: FlashWindow;

  /**
   * Create a listener that captures this view's handle.
   * Use for event handlers that need to update view state.
   */
  listener<E>(
    handler: (view: V, event: E, window: FlashWindow, cx: FlashEntityContext<V>) => void
  ): (event: E, window: FlashWindow, cx: FlashContext) => void;

  /**
   * Get or create a focus handle for this view.
   */
  focusHandle(): FocusHandle;
}

/**
 * Context available during window operations.
 */
export interface FlashWindowContext extends FlashContext {
  readonly windowId: WindowId;
  readonly window: FlashWindow;

  /**
   * Mark this window as needing repaint.
   */
  notify(): void;
}
