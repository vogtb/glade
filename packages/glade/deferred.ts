/**
 * Deferred element for Glade.
 *
 * Deferred elements run a SEPARATE layout pass after the main tree is complete.
 * This ensures overlay content (tooltips, menus, modals) gets window-sized
 * available space rather than being constrained by their parent's layout.
 *
 * Key behavior:
 * - Layout phase: returns a zero-sized placeholder, stores child for later
 * - Prepaint phase: registers child for deferred layout processing
 * - Deferred layout: Window runs separate layout pass with window dimensions
 * - Paint phase: empty (child paints in deferred pass after normal paint)
 *
 * Priority controls stacking order within deferred elements:
 * - Higher priority values paint on top (closer to viewer)
 * - Default priority is 0
 * - Tooltips might use priority 0, menus priority 1, modals priority 2
 */

// HitTestNode import kept for type definitions used externally
import type { HitTestNode } from "./dispatch.ts";
import {
  GladeElement,
  type GlobalElementId,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { LayoutId } from "./layout.ts";
import type { Bounds, Point } from "./types.ts";

/**
 * State passed from requestLayout to prepaint for DeferredElement.
 * Child is stored for deferred layout processing - not included in main tree.
 */
export interface DeferredRequestLayoutState {
  layoutId: LayoutId;
  child: GladeElement<unknown, unknown> | null;
  childElementId: GlobalElementId;
}

/**
 * State passed from prepaint to paint for DeferredElement.
 */
interface DeferredPrepaintState {
  hitTestNode: HitTestNode | null;
}

/**
 * Entry in the deferred draw queue.
 */
export interface DeferredDrawEntry {
  child: GladeElement<unknown, unknown>;
  bounds: Bounds;
  offset: Point;
  priority: number;
  childElementId: GlobalElementId;
  childPrepaintState: unknown;
  hitTestNode: HitTestNode | null;
}

/**
 * Entry in the deferred layout queue.
 * Elements registered here get a separate layout pass with window dimensions.
 */
export interface DeferredLayoutEntry {
  child: GladeElement<unknown, unknown>;
  childElementId: GlobalElementId;
  priority: number;
}

/**
 * Deferred element that paints its child after normal paint pass.
 */
export class DeferredElement extends GladeElement<
  DeferredRequestLayoutState,
  DeferredPrepaintState
> {
  private priorityValue = 0;
  private child: GladeElement<unknown, unknown> | null = null;

  constructor(child: GladeElement<unknown, unknown>) {
    super();
    this.child = child;
  }

  /**
   * Set the paint priority. Higher values paint on top.
   */
  priority(value: number): this {
    this.priorityValue = value;
    return this;
  }

  /**
   * Alias for priority() for GPUI compatibility.
   */
  withPriority(value: number): this {
    return this.priority(value);
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<DeferredRequestLayoutState> {
    // Return a zero-sized placeholder. The child is NOT included in the main layout tree.
    // Instead, it will be laid out separately with window dimensions during processDeferredLayouts.
    const layoutId = cx.requestLayout({ width: 0, height: 0 }, []);
    const childElementId = this.child ? cx.allocateChildId() : cx.elementId;

    return {
      layoutId,
      requestState: {
        layoutId,
        child: this.child,
        childElementId,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    _bounds: Bounds,
    requestState: DeferredRequestLayoutState
  ): DeferredPrepaintState {
    const { child, childElementId } = requestState;

    if (!child) {
      return { hitTestNode: null };
    }

    // Register for deferred layout processing.
    // The Window will run a separate layout pass with window dimensions,
    // then prepaint, then add to the deferred draw queue.
    cx.registerDeferredLayout?.({
      child,
      childElementId,
      priority: this.priorityValue,
    });

    // Hit test node will be set by processDeferredLayouts after the child's prepaint runs
    return { hitTestNode: null };
  }

  paint(_cx: PaintContext, _bounds: Bounds, _prepaintState: DeferredPrepaintState): void {
    // Empty - child paints in deferred pass
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

/**
 * Factory function to create a deferred element.
 */
export function deferred(child: GladeElement<unknown, unknown>): DeferredElement {
  return new DeferredElement(child);
}
