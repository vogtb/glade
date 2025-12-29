/**
 * Anchored element for Flash.
 *
 * Anchored elements position themselves relative to an anchor point
 * while automatically avoiding window overflow by either switching
 * anchor corners or snapping to window edges.
 *
 * Use cases:
 * - Context menus positioned at click point
 * - Tooltips positioned near trigger element
 * - Dropdown menus below trigger button
 * - Autocomplete popups near text input
 *
 * Combine with deferred() for proper z-ordering:
 *   deferred(anchored().position(point).child(menu))
 */

import {
  FlashContainerElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import type { Bounds, Point, Size } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { HitTestNode } from "./dispatch.ts";

/**
 * Corner position for anchoring.
 */
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Position mode determines the coordinate space for anchor position.
 */
export type AnchoredPositionMode = "window" | "local";

/**
 * Fit mode determines how overflow is handled.
 */
export type AnchoredFitMode =
  | "switch-anchor"
  | "snap-to-window"
  | { type: "snap-with-margin"; margins: Edges };

/**
 * Edge margins.
 */
export interface Edges {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Create uniform edges.
 */
export function edges(value: number): Edges;
export function edges(vertical: number, horizontal: number): Edges;
export function edges(top: number, right: number, bottom: number, left: number): Edges;
export function edges(a: number, b?: number, c?: number, d?: number): Edges {
  if (b === undefined) {
    return { top: a, right: a, bottom: a, left: a };
  }
  if (c === undefined) {
    return { top: a, right: b, bottom: a, left: b };
  }
  return { top: a, right: b, bottom: c, left: d ?? b };
}

/**
 * Get the opposite corner on a specific axis.
 */
function flipCornerHorizontal(corner: Corner): Corner {
  switch (corner) {
    case "top-left":
      return "top-right";
    case "top-right":
      return "top-left";
    case "bottom-left":
      return "bottom-right";
    case "bottom-right":
      return "bottom-left";
  }
}

function flipCornerVertical(corner: Corner): Corner {
  switch (corner) {
    case "top-left":
      return "bottom-left";
    case "top-right":
      return "bottom-right";
    case "bottom-left":
      return "top-left";
    case "bottom-right":
      return "top-right";
  }
}

/**
 * Calculate bounds from a corner position and size.
 * The corner position is where the specified corner of the bounds will be placed.
 */
function boundsFromCornerAndSize(corner: Corner, origin: Point, size: Size): Bounds {
  switch (corner) {
    case "top-left":
      return { x: origin.x, y: origin.y, width: size.width, height: size.height };
    case "top-right":
      return { x: origin.x - size.width, y: origin.y, width: size.width, height: size.height };
    case "bottom-left":
      return { x: origin.x, y: origin.y - size.height, width: size.width, height: size.height };
    case "bottom-right":
      return {
        x: origin.x - size.width,
        y: origin.y - size.height,
        width: size.width,
        height: size.height,
      };
  }
}

/**
 * State passed from requestLayout to prepaint.
 */
interface AnchoredRequestLayoutState {
  layoutId: LayoutId;
  childLayoutIds: LayoutId[];
  childElementIds: GlobalElementId[];
  childRequestStates: unknown[];
}

/**
 * State passed from prepaint to paint.
 */
interface AnchoredPrepaintState {
  childElementIds: GlobalElementId[];
  childPrepaintStates: unknown[];
  childBounds: Bounds[];
  offset: Point;
  hitTestNode: HitTestNode | null;
}

/**
 * Anchored element that positions content relative to an anchor point.
 */
export class AnchoredElement extends FlashContainerElement<
  AnchoredRequestLayoutState,
  AnchoredPrepaintState
> {
  private anchorCorner: Corner = "top-left";
  private anchorPosition: Point = { x: 0, y: 0 };
  private offsetValue: Point = { x: 0, y: 0 };
  private positionMode: AnchoredPositionMode = "window";
  private fitMode: AnchoredFitMode = "switch-anchor";
  private windowSize: Size = { width: 0, height: 0 };

  /**
   * Set the anchor corner. This corner of the element will be placed at the anchor position.
   */
  anchor(corner: Corner): this {
    this.anchorCorner = corner;
    return this;
  }

  /**
   * Set the anchor position (in window or local coordinates based on positionMode).
   */
  position(point: Point): this {
    this.anchorPosition = point;
    return this;
  }

  /**
   * Set additional offset from the anchor position.
   */
  offset(point: Point): this {
    this.offsetValue = point;
    return this;
  }

  /**
   * Set the position mode (window or local coordinates).
   */
  mode(mode: AnchoredPositionMode): this {
    this.positionMode = mode;
    return this;
  }

  /**
   * Set snap-to-window fit mode.
   */
  snapToWindow(): this {
    this.fitMode = "snap-to-window";
    return this;
  }

  /**
   * Set snap-to-window with margin fit mode.
   */
  snapToWindowWithMargin(margins: Edges | number): this {
    const edgeMargins = typeof margins === "number" ? edges(margins) : margins;
    this.fitMode = { type: "snap-with-margin", margins: edgeMargins };
    return this;
  }

  /**
   * Set switch-anchor fit mode (default).
   */
  switchAnchor(): this {
    this.fitMode = "switch-anchor";
    return this;
  }

  /**
   * Set window size for overflow detection.
   * This is called automatically by the prepaint context.
   */
  setWindowSize(size: Size): this {
    this.windowSize = size;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<AnchoredRequestLayoutState> {
    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: unknown[] = [];

    for (const child of this.children) {
      const childElementId = cx.allocateChildId();
      childElementIds.push(childElementId);

      const childCx: RequestLayoutContext = {
        ...cx,
        elementId: childElementId,
      };

      const { layoutId: childLayoutId, requestState } = child.requestLayout(childCx);
      childLayoutIds.push(childLayoutId);
      childRequestStates.push(requestState);
    }

    const layoutId = cx.requestLayout({}, childLayoutIds);

    return {
      layoutId,
      requestState: {
        layoutId,
        childLayoutIds,
        childElementIds,
        childRequestStates,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: AnchoredRequestLayoutState
  ): AnchoredPrepaintState {
    const { childLayoutIds, childElementIds, childRequestStates } = requestState;

    if (this.children.length === 0) {
      return {
        childElementIds: [],
        childPrepaintStates: [],
        childBounds: [],
        offset: { x: 0, y: 0 },
        hitTestNode: null,
      };
    }

    const childLayoutBounds = cx.getChildLayouts(bounds, childLayoutIds);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const cb of childLayoutBounds) {
      minX = Math.min(minX, cb.x);
      minY = Math.min(minY, cb.y);
      maxX = Math.max(maxX, cb.x + cb.width);
      maxY = Math.max(maxY, cb.y + cb.height);
    }

    const contentSize: Size = {
      width: maxX - minX,
      height: maxY - minY,
    };

    const anchorPoint: Point = {
      x: this.anchorPosition.x + this.offsetValue.x,
      y: this.anchorPosition.y + this.offsetValue.y,
    };

    let currentCorner = this.anchorCorner;
    let desired = boundsFromCornerAndSize(currentCorner, anchorPoint, contentSize);

    const limits: Bounds = {
      x: 0,
      y: 0,
      width: this.windowSize.width,
      height: this.windowSize.height,
    };

    if (this.fitMode === "switch-anchor") {
      if (desired.x < limits.x || desired.x + desired.width > limits.x + limits.width) {
        const flippedCorner = flipCornerHorizontal(currentCorner);
        const switched = boundsFromCornerAndSize(flippedCorner, anchorPoint, contentSize);
        if (switched.x >= limits.x && switched.x + switched.width <= limits.x + limits.width) {
          currentCorner = flippedCorner;
          desired = switched;
        }
      }

      if (desired.y < limits.y || desired.y + desired.height > limits.y + limits.height) {
        const flippedCorner = flipCornerVertical(currentCorner);
        const switched = boundsFromCornerAndSize(flippedCorner, anchorPoint, contentSize);
        if (switched.y >= limits.y && switched.y + switched.height <= limits.y + limits.height) {
          currentCorner = flippedCorner;
          desired = switched;
        }
      }
    }

    let marginEdges: Edges = { top: 0, right: 0, bottom: 0, left: 0 };
    if (typeof this.fitMode === "object" && this.fitMode.type === "snap-with-margin") {
      marginEdges = this.fitMode.margins;
    }

    if (desired.x + desired.width > limits.x + limits.width - marginEdges.right) {
      desired.x = limits.x + limits.width - desired.width - marginEdges.right;
    }
    if (desired.x < limits.x + marginEdges.left) {
      desired.x = limits.x + marginEdges.left;
    }
    if (desired.y + desired.height > limits.y + limits.height - marginEdges.bottom) {
      desired.y = limits.y + limits.height - desired.height - marginEdges.bottom;
    }
    if (desired.y < limits.y + marginEdges.top) {
      desired.y = limits.y + marginEdges.top;
    }

    const offset: Point = {
      x: Math.round(desired.x - bounds.x),
      y: Math.round(desired.y - bounds.y),
    };

    const childPrepaintStates: unknown[] = [];
    const adjustedChildBounds: Bounds[] = [];
    const childHitTestNodes: HitTestNode[] = [];

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]!;
      const childElementId = childElementIds[i]!;
      const childLayoutBound = childLayoutBounds[i]!;
      const childRequestState = childRequestStates[i];

      const adjustedBounds: Bounds = {
        x: childLayoutBound.x + offset.x,
        y: childLayoutBound.y + offset.y,
        width: childLayoutBound.width,
        height: childLayoutBound.height,
      };
      adjustedChildBounds.push(adjustedBounds);

      const childCx = cx.withElementId(childElementId);
      const prepaintState = child.prepaint(childCx, adjustedBounds, childRequestState);
      childPrepaintStates.push(prepaintState);

      const childHitTest = (prepaintState as { hitTestNode?: HitTestNode } | undefined)
        ?.hitTestNode;
      if (childHitTest) {
        childHitTestNodes.push(childHitTest);
      }
    }

    const hitTestNode: HitTestNode = {
      bounds: desired,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: childHitTestNodes,
      allowChildOutsideBounds: true,
    };

    return {
      childElementIds,
      childPrepaintStates,
      childBounds: adjustedChildBounds,
      offset,
      hitTestNode,
    };
  }

  paint(cx: PaintContext, _bounds: Bounds, prepaintState: AnchoredPrepaintState): void {
    const { childElementIds, childPrepaintStates, childBounds } = prepaintState;

    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i]!;
      const childElementId = childElementIds[i]!;
      const childBound = childBounds[i]!;
      const childPrepaintState = childPrepaintStates[i];

      const childCx = cx.withElementId(childElementId);
      child.paint(childCx, childBound, childPrepaintState);
    }
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: null,
      keyContext: null,
      children: [],
    };
  }
}

/**
 * Factory function to create an anchored element.
 */
export function anchored(): AnchoredElement {
  return new AnchoredElement();
}
