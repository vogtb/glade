/**
 * Drag and Drop system for Glade.
 *
 * Provides drag state tracking, drag previews, and drop target handling.
 * Inspired by GPUI's drag/drop system.
 */

import type { Point, Bounds, WindowId } from "./types.ts";
import type { GladeElement } from "./element.ts";
import type { GladeContext } from "./context.ts";
import type { GladeWindow } from "./window.ts";
import type { HitboxId } from "./hitbox.ts";

/**
 * Unique identifier for a drag operation.
 */
declare const __dragIdBrand: unique symbol;
export type DragId = number & { [__dragIdBrand]: true };

/**
 * Handler that starts a drag operation.
 * Returns the drag payload and optionally a custom drag preview element.
 */
export type DragHandler<T = unknown> = (
  position: Point,
  window: GladeWindow,
  cx: GladeContext
) => DragPayload<T> | null;

/**
 * Handler for when a drop occurs.
 */
export type DropHandler<T = unknown> = (
  payload: T,
  position: Point,
  window: GladeWindow,
  cx: GladeContext
) => void;

/**
 * Predicate to check if a drop target can accept a drag payload.
 */
export type CanDropPredicate<T = unknown> = (payload: T, cx: GladeContext) => boolean;

/**
 * Drag payload with optional custom preview.
 */
export interface DragPayload<T = unknown> {
  /** The data being dragged. */
  data: T;
  /** Optional custom preview element to render at cursor. */
  preview?: GladeElement;
  /** Optional offset from cursor for the preview. */
  previewOffset?: Point;
}

/**
 * Active drag state tracked by GladeWindow.
 */
export interface ActiveDrag<T = unknown> {
  /** Unique ID for this drag operation. */
  id: DragId;
  /** The drag payload. */
  payload: DragPayload<T>;
  /** Window where drag started. */
  sourceWindowId: WindowId;
  /** Current cursor position. */
  position: Point;
  /** Starting position of the drag. */
  startPosition: Point;
  /** Hitbox ID of the element being dragged. */
  sourceHitboxId: HitboxId | null;
}

/**
 * Drop target registration.
 */
export interface DropTarget<T = unknown> {
  /** Hitbox ID of the drop target. */
  hitboxId: HitboxId;
  /** Bounds of the drop target. */
  bounds: Bounds;
  /** Handler called when a drop occurs. */
  onDrop: DropHandler<T>;
  /** Optional predicate to check if drop is allowed. */
  canDrop?: CanDropPredicate<T>;
}

/**
 * Drag tracker for managing drag operations.
 */
export class DragTracker {
  private activeDrag: ActiveDrag | null = null;
  private nextDragId = 1;
  private dropTargets = new Map<HitboxId, DropTarget>();

  /** Minimum distance before drag starts. */
  static readonly DRAG_THRESHOLD = 4;

  /**
   * Start a potential drag operation.
   * Returns a drag ID that can be used to check if drag is still active.
   */
  startPotentialDrag<T>(
    position: Point,
    windowId: WindowId,
    payload: DragPayload<T>,
    sourceHitboxId: HitboxId | null
  ): DragId {
    const id = this.nextDragId++ as DragId;
    this.activeDrag = {
      id,
      payload,
      sourceWindowId: windowId,
      position: { ...position },
      startPosition: { ...position },
      sourceHitboxId,
    };
    return id;
  }

  /**
   * Update the drag position.
   * Returns true if the drag threshold has been exceeded.
   */
  updatePosition(position: Point): boolean {
    if (!this.activeDrag) {
      return false;
    }

    this.activeDrag.position = { ...position };

    const dx = position.x - this.activeDrag.startPosition.x;
    const dy = position.y - this.activeDrag.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance >= DragTracker.DRAG_THRESHOLD;
  }

  /**
   * Check if there's an active drag.
   */
  isDragging(): boolean {
    if (!this.activeDrag) {
      return false;
    }

    const dx = this.activeDrag.position.x - this.activeDrag.startPosition.x;
    const dy = this.activeDrag.position.y - this.activeDrag.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance >= DragTracker.DRAG_THRESHOLD;
  }

  /**
   * Get the active drag state.
   */
  getActiveDrag<T = unknown>(): ActiveDrag<T> | null {
    return this.activeDrag as ActiveDrag<T> | null;
  }

  /**
   * Cancel the current drag operation.
   */
  cancel(): void {
    this.activeDrag = null;
  }

  /**
   * End the drag operation and return the payload if over a valid drop target.
   */
  endDrag(): ActiveDrag | null {
    const drag = this.activeDrag;
    this.activeDrag = null;
    return drag;
  }

  /**
   * Register a drop target.
   */
  registerDropTarget<T>(
    hitboxId: HitboxId,
    bounds: Bounds,
    onDrop: DropHandler<T>,
    canDrop?: CanDropPredicate<T>
  ): void {
    this.dropTargets.set(hitboxId, {
      hitboxId,
      bounds,
      onDrop: onDrop as DropHandler,
      canDrop: canDrop as CanDropPredicate | undefined,
    });
  }

  /**
   * Unregister a drop target.
   */
  unregisterDropTarget(hitboxId: HitboxId): void {
    this.dropTargets.delete(hitboxId);
  }

  /**
   * Clear all drop targets (called each frame).
   */
  clearDropTargets(): void {
    this.dropTargets.clear();
  }

  /**
   * Find the drop target at the given position.
   */
  findDropTarget(position: Point): DropTarget | null {
    for (const target of this.dropTargets.values()) {
      const { bounds } = target;
      if (
        position.x >= bounds.x &&
        position.x < bounds.x + bounds.width &&
        position.y >= bounds.y &&
        position.y < bounds.y + bounds.height
      ) {
        return target;
      }
    }
    return null;
  }

  /**
   * Check if a drop target can accept the current drag payload.
   */
  canDrop(target: DropTarget, cx: GladeContext): boolean {
    if (!this.activeDrag) {
      return false;
    }
    if (!target.canDrop) {
      return true;
    }
    return target.canDrop(this.activeDrag.payload.data, cx);
  }

  /**
   * Check if the current drag is over a valid drop target.
   */
  isOverValidDropTarget(cx: GladeContext): boolean {
    if (!this.activeDrag) {
      return false;
    }
    const target = this.findDropTarget(this.activeDrag.position);
    if (!target) {
      return false;
    }
    return this.canDrop(target, cx);
  }
}

/**
 * Create a simple drag payload with just data.
 */
export function dragPayload<T>(data: T): DragPayload<T> {
  return { data };
}

/**
 * Create a drag payload with a custom preview.
 */
export function dragPayloadWithPreview<T>(
  data: T,
  preview: GladeElement,
  offset?: Point
): DragPayload<T> {
  return { data, preview, previewOffset: offset };
}
