/**
 * Deferred element for Glade.
 *
 * Deferred elements delay their paint phase until after all normal elements
 * have painted. This enables overlay content (tooltips, menus, modals) to
 * appear on top of the normal element tree while maintaining proper layout.
 *
 * Key behavior:
 * - Layout phase: child is laid out normally in the tree
 * - Prepaint phase: child is extracted and queued for deferred drawing
 * - Paint phase: empty (child paints in deferred pass after normal paint)
 *
 * Priority controls stacking order within deferred elements:
 * - Higher priority values paint on top (closer to viewer)
 * - Default priority is 0
 * - Tooltips might use priority 0, menus priority 1, modals priority 2
 */

import {
  GladeElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import type { Bounds, Point } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode } from "./dispatch.ts";

/**
 * State passed from requestLayout to prepaint for DeferredElement.
 */
interface DeferredRequestLayoutState {
  layoutId: LayoutId;
  childLayoutId: LayoutId;
  childElementId: GlobalElementId;
  childRequestState: unknown;
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
    if (!this.child) {
      const layoutId = cx.requestLayout({ width: 0, height: 0 }, []);
      return {
        layoutId,
        requestState: {
          layoutId,
          childLayoutId: layoutId,
          childElementId: cx.elementId,
          childRequestState: undefined,
        },
      };
    }

    const childElementId = cx.allocateChildId();
    const childCx: RequestLayoutContext = {
      ...cx,
      elementId: childElementId,
    };

    const { layoutId: childLayoutId, requestState: childRequestState } =
      this.child.requestLayout(childCx);

    const layoutId = cx.requestLayout({}, [childLayoutId]);

    return {
      layoutId,
      requestState: {
        layoutId,
        childLayoutId,
        childElementId,
        childRequestState,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: DeferredRequestLayoutState
  ): DeferredPrepaintState {
    if (!this.child) {
      return { hitTestNode: null };
    }

    const { childLayoutId, childElementId, childRequestState } = requestState;

    const childBounds = cx.getBounds(childLayoutId);
    const childCx = cx.withElementId(childElementId);
    const childPrepaintState = this.child.prepaint(childCx, childBounds, childRequestState);

    const offset: Point = {
      x: bounds.x,
      y: bounds.y,
    };

    const entry: DeferredDrawEntry = {
      child: this.child,
      bounds: childBounds,
      offset,
      priority: this.priorityValue,
      childElementId,
      childPrepaintState,
      hitTestNode:
        (childPrepaintState as { hitTestNode?: HitTestNode } | undefined)?.hitTestNode ?? null,
    };

    cx.registerDeferredDraw?.(entry);

    this.child = null;

    return {
      hitTestNode: entry.hitTestNode,
    };
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
