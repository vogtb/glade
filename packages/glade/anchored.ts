/**
 * Anchored element for Glade.
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

import type { HitTestNode } from "./dispatch.ts";
import {
  GladeContainerElement,
  type GlobalElementId,
  type PaintContext,
  type PrepaintContext,
  type RequestLayoutContext,
  type RequestLayoutResult,
} from "./element.ts";
import type { LayoutId } from "./layout.ts";
import type { Bounds, Point, Size } from "./types.ts";

/**
 * Corner position for anchoring.
 */
export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Side position relative to a trigger element.
 */
export type AnchoredSide = "top" | "bottom" | "left" | "right";

/**
 * Alignment along the side.
 */
export type AnchoredAlign = "start" | "center" | "end";

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
export class AnchoredElement extends GladeContainerElement<
  AnchoredRequestLayoutState,
  AnchoredPrepaintState
> {
  private anchorCorner: Corner = "top-left";
  private anchorPosition: Point = { x: 0, y: 0 };
  private offsetValue: Point = { x: 0, y: 0 };
  private positionMode: AnchoredPositionMode = "window";
  private fitMode: AnchoredFitMode = "switch-anchor";
  private windowSize: Size = { width: 0, height: 0 };

  // Side/align positioning (alternative to direct corner positioning)
  private sideValue: AnchoredSide | null = null;
  private alignValue: AnchoredAlign = "start";
  private sideOffsetValue = 0;
  private triggerBoundsValue: Bounds | null = null;
  private centerInWindowValue = false;

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

  /**
   * Set the side relative to trigger bounds.
   * Use with triggerBounds() for popover/dropdown positioning.
   */
  side(side: AnchoredSide): this {
    this.sideValue = side;
    return this;
  }

  /**
   * Set alignment along the side.
   * Use with side() and triggerBounds().
   */
  align(align: AnchoredAlign): this {
    this.alignValue = align;
    return this;
  }

  /**
   * Set offset from the trigger when using side positioning.
   */
  sideOffset(offset: number): this {
    this.sideOffsetValue = offset;
    return this;
  }

  /**
   * Set the trigger element bounds for side/align positioning.
   */
  triggerBounds(bounds: Bounds): this {
    this.triggerBoundsValue = bounds;
    return this;
  }

  /**
   * Center the element in the window.
   * Used for dialogs/modals.
   */
  centerInWindow(): this {
    this.centerInWindowValue = true;
    return this;
  }

  /**
   * Calculate anchor position and corner from side/align/trigger settings.
   */
  private calculateSidePosition(
    trigger: Bounds,
    side: AnchoredSide,
    align: AnchoredAlign,
    offset: number
  ): { position: Point; corner: Corner } {
    let x: number = trigger.x;
    let y: number = trigger.y;
    let corner: Corner = "top-left";

    switch (side) {
      case "bottom":
        y = trigger.y + trigger.height + offset;
        corner = "top-left";
        break;
      case "top":
        y = trigger.y - offset;
        corner = "bottom-left";
        break;
      case "right":
        x = trigger.x + trigger.width + offset;
        y = trigger.y;
        corner = "top-left";
        break;
      case "left":
        x = trigger.x - offset;
        y = trigger.y;
        corner = "top-right";
        break;
    }

    // Handle alignment
    if (side === "bottom" || side === "top") {
      switch (align) {
        case "start":
          x = trigger.x;
          break;
        case "center":
          x = trigger.x + trigger.width / 2;
          corner = side === "bottom" ? "top-left" : "bottom-left";
          break;
        case "end":
          x = trigger.x + trigger.width;
          corner = side === "bottom" ? "top-right" : "bottom-right";
          break;
      }
    } else {
      switch (align) {
        case "start":
          y = trigger.y;
          break;
        case "center":
          y = trigger.y + trigger.height / 2;
          break;
        case "end":
          y = trigger.y + trigger.height;
          corner = side === "right" ? "bottom-left" : "bottom-right";
          break;
      }
    }

    return { position: { x, y }, corner };
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<AnchoredRequestLayoutState> {
    const childLayoutIds: LayoutId[] = [];
    const childElementIds: GlobalElementId[] = [];
    const childRequestStates: unknown[] = [];

    for (const child of this.children__) {
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

    if (this.children__.length === 0) {
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

    // Determine anchor position and corner based on positioning mode
    let anchorPoint: Point;
    let currentCorner: Corner;

    if (this.centerInWindowValue) {
      // Center in window mode - position at window center
      anchorPoint = {
        x: this.windowSize.width / 2,
        y: this.windowSize.height / 2,
      };
      // Use top-left corner offset to center the content
      currentCorner = "top-left";
      // Adjust to center the content
      anchorPoint.x -= contentSize.width / 2;
      anchorPoint.y -= contentSize.height / 2;
    } else if (this.sideValue !== null && this.triggerBoundsValue !== null) {
      // Side/align positioning relative to trigger
      const result = this.calculateSidePosition(
        this.triggerBoundsValue,
        this.sideValue,
        this.alignValue,
        this.sideOffsetValue
      );
      anchorPoint = {
        x: result.position.x + this.offsetValue.x,
        y: result.position.y + this.offsetValue.y,
      };
      currentCorner = result.corner;
    } else {
      // Direct position/corner mode (original behavior)
      anchorPoint = {
        x: this.anchorPosition.x + this.offsetValue.x,
        y: this.anchorPosition.y + this.offsetValue.y,
      };
      currentCorner = this.anchorCorner;
    }

    let desired = boundsFromCornerAndSize(currentCorner, anchorPoint, contentSize);

    const limits: Bounds = {
      x: 0,
      y: 0,
      width: this.windowSize.width,
      height: this.windowSize.height,
    };

    // Skip switch-anchor logic for centerInWindow mode
    if (this.fitMode === "switch-anchor" && !this.centerInWindowValue) {
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

    for (let i = 0; i < this.children__.length; i++) {
      const child = this.children__[i]!;
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

    for (let i = 0; i < this.children__.length; i++) {
      const child = this.children__[i]!;
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
