/**
 * Context hierarchy for Glade.
 *
 * Contexts provide access to app functionality. Different context types
 * are available in different situations (reading, updating, rendering).
 */

import type { EntityId, FocusId, WindowId, GladeTask, ScrollOffset, Bounds } from "./types.ts";
import type { Theme, ThemeConfig, ThemeOverrides } from "./theme.ts";
import type { ColorScheme } from "@glade/core";
import type {
  GladeHandle,
  GladeViewHandle,
  FocusHandle,
  ScrollHandle,
  ObserverHandle,
  SubscriberHandle,
} from "./entity.ts";
import type { GladeView } from "./element.ts";
import type { GladeWindow } from "./window.ts";

/**
 * Effect types that are queued and processed after the current update completes.
 */
export type GladeEffect =
  | { type: "notify"; entityId: EntityId }
  | { type: "emit"; entityId: EntityId; eventType: string; event: unknown }
  | { type: "focus"; focusId: FocusId; windowId: WindowId }
  | { type: "blur"; focusId: FocusId; windowId: WindowId }
  | { type: "release"; entityId: EntityId }
  | { type: "callback"; callback: () => void };

/**
 * Read-only context - can read entity state but not modify.
 */
export interface GladeReadContext {
  /**
   * Read an entity's state immutably.
   */
  readEntity<T>(handle: GladeHandle<T>): Readonly<T>;

  /**
   * Get the current resolved theme.
   */
  getTheme(): Theme;

  /**
   * Get the platform color scheme preference.
   */
  getSystemColorScheme(): ColorScheme;

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
export interface GladeContext extends GladeReadContext {
  /**
   * Override the active theme using a full theme or a theme config.
   */
  setTheme(config: Theme | ThemeConfig): void;

  /**
   * Override only the scheme (light/dark/system).
   */
  setThemeScheme(scheme: ColorScheme | "system"): void;

  /**
   * Override theme tokens while keeping the current scheme.
   */
  setThemeOverrides(overrides: ThemeOverrides): void;

  // Entity management

  /**
   * Create a new entity with the given initializer.
   */
  newEntity<T>(initializer: (cx: GladeEntityContext<T>) => T): GladeHandle<T>;

  /**
   * Create a new view entity.
   */
  newView<V extends GladeView>(initializer: (cx: GladeEntityContext<V>) => V): GladeViewHandle<V>;

  /**
   * Update an entity with exclusive access.
   */
  updateEntity<T, R>(handle: GladeHandle<T>, f: (state: T, cx: GladeEntityContext<T>) => R): R;

  // Observations

  /**
   * Observe an entity - callback is invoked when entity calls notify().
   */
  observe<T>(
    handle: GladeHandle<T>,
    callback: (observed: Readonly<T>, cx: GladeContext) => void
  ): ObserverHandle;

  /**
   * Subscribe to typed events from an entity.
   */
  subscribe<T, E>(
    handle: GladeHandle<T>,
    eventType: string,
    callback: (event: E, cx: GladeContext) => void
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
  spawn<T>(future: Promise<T>): GladeTask<T>;

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
export interface GladeEntityContext<_T> extends GladeContext {
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
export interface GladeViewContext<V extends GladeView> extends GladeEntityContext<V> {
  readonly windowId: WindowId;
  readonly window: GladeWindow;

  /**
   * Create a listener that captures this view's handle.
   * Use for event handlers that need to update view state.
   */
  listener<E>(
    handler: (view: V, event: E, window: GladeWindow, cx: GladeEntityContext<V>) => void
  ): (event: E, window: GladeWindow, cx: GladeContext) => void;

  /**
   * Get or create a focus handle for this view.
   */
  focusHandle(): FocusHandle;
}

/**
 * Context available during window operations.
 */
export interface GladeWindowContext extends GladeContext {
  readonly windowId: WindowId;
  readonly window: GladeWindow;

  /**
   * Mark this window as needing repaint.
   */
  notify(): void;
}
