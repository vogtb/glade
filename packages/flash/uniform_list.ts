/**
 * UniformList - Virtual scrolling for fixed-height items.
 *
 * Renders only visible items for efficient handling of large lists.
 * All items must have the same height.
 *
 * Inspired by GPUI's uniform_list.
 *
 * TODO: absorb into list.ts
 */

import {
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import type { Bounds, Color, ScrollOffset } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { Styles } from "./styles.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { FlashContext } from "./context.ts";
import type { ScrollHandle } from "./entity.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";

/**
 * Scroll-to strategies for scrollToItem.
 */
export type ScrollToStrategy = "top" | "center" | "bottom" | "nearest";

/**
 * Props for rendering an item.
 */
export interface UniformListItemProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Callback to render a single item.
 */
export type UniformListRenderItem<T> = (
  item: T,
  props: UniformListItemProps,
  cx: FlashContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => FlashElement<any, any>;

/**
 * State passed from requestLayout to prepaint.
 */
interface UniformListRequestState {
  layoutId: LayoutId;
  itemLayoutIds: LayoutId[];
  itemElementIds: GlobalElementId[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemRequestStates: any[];
  visibleRange: { start: number; end: number };
}

/**
 * State passed from prepaint to paint.
 */
interface UniformListPrepaintState {
  itemLayoutIds: LayoutId[];
  itemElementIds: GlobalElementId[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemPrepaintStates: any[];
  itemBounds: Bounds[];
  hitbox: Hitbox | null;
  hitTestNode: HitTestNode;
  visibleRange: { start: number; end: number };
}

/**
 * UniformList element for virtual scrolling with fixed-height items.
 */
export class UniformList<T> extends FlashElement<
  UniformListRequestState,
  UniformListPrepaintState
> {
  private items: T[] = [];
  private itemHeight = 40;
  private overdraw = 2;
  private renderItemFn: UniformListRenderItem<T>;
  private scrollHandleRef: ScrollHandle | null = null;
  private styles: Partial<Styles> = {};
  private context: FlashContext | null = null;

  constructor(renderItem: UniformListRenderItem<T>) {
    super();
    this.renderItemFn = renderItem;
    this.styles.display = "flex";
    this.styles.flexDirection = "column";
    this.styles.overflow = "hidden";
  }

  /**
   * Set the items to display.
   */
  data(items: T[]): this {
    this.items = items;
    return this;
  }

  /**
   * Set the fixed height for each item.
   */
  itemSize(height: number): this {
    this.itemHeight = height;
    return this;
  }

  /**
   * Set overdraw count (extra items rendered above/below visible area).
   */
  setOverdraw(count: number): this {
    this.overdraw = count;
    return this;
  }

  /**
   * Track scroll state with a scroll handle.
   */
  trackScroll(handle: ScrollHandle): this {
    this.scrollHandleRef = handle;
    return this;
  }

  /**
   * Set the context for item rendering.
   */
  setContext(cx: FlashContext): this {
    this.context = cx;
    return this;
  }

  /**
   * Set width.
   */
  w(value: number | string): this {
    this.styles.width = value;
    return this;
  }

  /**
   * Set height.
   */
  h(value: number | string): this {
    this.styles.height = value;
    return this;
  }

  /**
   * Set flex grow.
   */
  flex1(): this {
    this.styles.flex = "1 1 0%";
    return this;
  }

  /**
   * Set background color.
   */
  bg(color: Color): this {
    this.styles.backgroundColor = color;
    return this;
  }

  /**
   * Set padding.
   */
  p(v: number): this {
    this.styles.paddingTop = v;
    this.styles.paddingRight = v;
    this.styles.paddingBottom = v;
    this.styles.paddingLeft = v;
    return this;
  }

  /**
   * Set gap between items.
   */
  gap(v: number): this {
    this.styles.gap = v;
    return this;
  }

  /**
   * Set border radius.
   */
  rounded(v: number): this {
    this.styles.borderRadius = v;
    return this;
  }

  /**
   * Scroll to a specific item.
   */
  scrollToItem(cx: FlashContext, index: number, strategy: ScrollToStrategy = "nearest"): void {
    if (!this.scrollHandleRef || index < 0 || index >= this.items.length) {
      return;
    }

    const itemTop = index * this.itemHeight;
    const itemBottom = itemTop + this.itemHeight;
    const currentOffset = cx.getScrollOffset(this.scrollHandleRef);

    let newY = currentOffset.y;

    switch (strategy) {
      case "top":
        newY = itemTop;
        break;
      case "center":
        // Would need viewport height, use persistent state in real implementation
        newY = itemTop;
        break;
      case "bottom":
        // Would need viewport height
        newY = itemTop;
        break;
      case "nearest":
        if (itemTop < currentOffset.y) {
          newY = itemTop;
        } else if (itemBottom > currentOffset.y) {
          // Approximate: scroll just enough to show item
          newY = Math.max(0, itemTop);
        }
        break;
    }

    cx.setScrollOffset(this.scrollHandleRef, { x: currentOffset.x, y: newY });
  }

  /**
   * Calculate the visible range of items based on scroll offset.
   */
  private calculateVisibleRange(
    scrollY: number,
    viewportHeight: number
  ): { start: number; end: number } {
    const totalItems = this.items.length;
    if (totalItems === 0) {
      return { start: 0, end: 0 };
    }

    const firstVisible = Math.floor(scrollY / this.itemHeight);
    const visibleCount = Math.ceil(viewportHeight / this.itemHeight);
    const lastVisible = firstVisible + visibleCount;

    const start = Math.max(0, firstVisible - this.overdraw);
    const end = Math.min(totalItems, lastVisible + this.overdraw + 1);

    return { start, end };
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<UniformListRequestState> {
    // Get actual scroll offset if we have a scroll handle
    const scrollOffset = this.scrollHandleRef
      ? cx.getScrollOffset(this.scrollHandleRef)
      : { x: 0, y: 0 };

    // We need viewport height to compute visible range, but we don't have it yet.
    // Use a placeholder; actual visible range is refined in prepaint.
    const estimatedViewportHeight = 600;

    const visibleRange = this.calculateVisibleRange(scrollOffset.y, estimatedViewportHeight);
    const itemLayoutIds: LayoutId[] = [];
    const itemElementIds: GlobalElementId[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemRequestStates: any[] = [];

    // Only create layout for visible items
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const item = this.items[i];
      if (item === undefined) continue;

      const props: UniformListItemProps = {
        index: i,
        isFirst: i === 0,
        isLast: i === this.items.length - 1,
      };

      const element = this.context ? this.renderItemFn(item, props, this.context) : null;

      if (!element) continue;

      const childId = cx.allocateChildId();
      itemElementIds.push(childId);

      const childCx = {
        ...cx,
        elementId: childId,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (element as FlashElement<any, any>).requestLayout(childCx);
      itemLayoutIds.push(result.layoutId);
      itemRequestStates.push({ element, requestState: result.requestState });
    }

    // Create an inner measurement container that holds items for proper width computation
    // This container is positioned absolutely so it doesn't affect the outer container's flex sizing
    // Items get correct parent width constraint from this container
    const measureContainerLayoutId = cx.requestLayout(
      {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        display: "flex",
        flexDirection: "column",
      },
      itemLayoutIds
    );

    // Outer container uses our styles but with position:relative to contain the absolute child
    const layoutId = cx.requestLayout({ ...this.styles, position: "relative" }, [
      measureContainerLayoutId,
    ]);

    return {
      layoutId,
      requestState: {
        layoutId,
        itemLayoutIds,
        itemElementIds,
        itemRequestStates,
        visibleRange,
      },
    };
  }

  prepaint(
    cx: PrepaintContext,
    bounds: Bounds,
    requestState: UniformListRequestState
  ): UniformListPrepaintState {
    const { itemLayoutIds, itemElementIds, itemRequestStates } = requestState;

    // Get actual scroll offset now
    const scrollOffset: ScrollOffset = this.scrollHandleRef
      ? cx.getScrollOffset(this.scrollHandleRef)
      : { x: 0, y: 0 };

    // Recalculate visible range with actual viewport
    const visibleRange = this.calculateVisibleRange(scrollOffset.y, bounds.height);

    // Insert hitbox for scroll handling
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal);

    // Get padding values for content area
    const paddingTop = this.styles.paddingTop ?? 0;
    const paddingBottom = this.styles.paddingBottom ?? 0;
    const paddingLeft = this.styles.paddingLeft ?? 0;
    const paddingRight = this.styles.paddingRight ?? 0;

    // Update scroll content size (include padding in total content height)
    if (this.scrollHandleRef) {
      const totalHeight = this.items.length * this.itemHeight + paddingTop + paddingBottom;
      cx.updateScrollContentSize(
        this.scrollHandleRef,
        { width: bounds.width, height: totalHeight },
        { width: bounds.width, height: bounds.height },
        { x: bounds.x, y: bounds.y }
      );
    }

    // Calculate content area (bounds minus padding)
    const contentX = bounds.x + paddingLeft;
    const contentY = bounds.y + paddingTop;
    const contentWidth = bounds.width - paddingLeft - paddingRight;

    // Calculate item bounds with scroll offset
    const itemBounds: Bounds[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemPrepaintStates: any[] = [];

    for (let i = 0; i < itemRequestStates.length; i++) {
      const { element, requestState: childRequestState } = itemRequestStates[i];
      const visualIndex = visibleRange.start + i;
      const childId = itemElementIds[i]!;

      // Position item at its virtual position, offset by scroll
      const itemY = visualIndex * this.itemHeight - scrollOffset.y;
      const itemBound: Bounds = {
        x: contentX,
        y: contentY + itemY,
        width: contentWidth,
        height: this.itemHeight,
      };
      itemBounds.push(itemBound);

      const childCx = cx.withElementId(childId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prepaintState = (element as FlashElement<any, any>).prepaint(
        childCx,
        itemBound,
        childRequestState
      );
      itemPrepaintStates.push({ element, prepaintState });
    }

    // Build hit test node
    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: this.scrollHandleRef,
      keyContext: null,
      children: [],
    };

    return {
      itemLayoutIds,
      itemElementIds,
      itemPrepaintStates,
      itemBounds,
      hitbox,
      hitTestNode,
      visibleRange,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: UniformListPrepaintState): void {
    const { itemElementIds, itemPrepaintStates, itemBounds } = prepaintState;

    // Paint background if set
    if (this.styles.backgroundColor) {
      cx.paintRect(bounds, this.styles);
    }

    // Clip children to container bounds
    cx.withContentMask(
      {
        bounds,
        cornerRadius: this.styles.borderRadius ?? 0,
      },
      () => {
        // Paint visible items
        for (let i = 0; i < itemPrepaintStates.length; i++) {
          const { element, prepaintState: childPrepaintState } = itemPrepaintStates[i];
          const childBound = itemBounds[i]!;
          const childId = itemElementIds[i]!;

          // Skip items that are completely outside the viewport
          if (
            childBound.y + childBound.height < bounds.y ||
            childBound.y > bounds.y + bounds.height
          ) {
            continue;
          }

          const childCx = cx.withElementId(childId);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (element as FlashElement<any, any>).paint(childCx, childBound, childPrepaintState);
        }
      }
    );
  }

  hitTest(bounds: Bounds, _childBounds: Bounds[]): HitTestNode {
    return {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle: this.scrollHandleRef,
      keyContext: null,
      children: [],
    };
  }
}

/**
 * Factory function to create a uniform list.
 */
export function uniformList<T>(renderItem: UniformListRenderItem<T>): UniformList<T> {
  return new UniformList(renderItem);
}
