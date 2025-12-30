/**
 * List - Virtual scrolling for variable-height items.
 *
 * Uses a height cache with lazy measurement for efficient handling
 * of lists with items of varying heights.
 *
 * Inspired by GPUI's list element with ListState.
 */

import {
  FlashElement,
  type RequestLayoutContext,
  type PrepaintContext,
  type PaintContext,
  type RequestLayoutResult,
  type GlobalElementId,
} from "./element.ts";
import { toColorObject, type Bounds, type Color, type ScrollOffset } from "./types.ts";
import type { LayoutId } from "./layout.ts";
import type { Styles } from "./styles.ts";
import type { HitTestNode } from "./dispatch.ts";
import type { FlashContext } from "./context.ts";
import type { ScrollHandle } from "./entity.ts";
import type { Hitbox } from "./hitbox.ts";
import { HitboxBehavior } from "./hitbox.ts";

/**
 * Alignment for list items (top-aligned or bottom-aligned).
 * Bottom alignment is useful for chat UIs.
 */
export type ListAlignment = "top" | "bottom";

/**
 * List offset for scroll positioning.
 */
export interface ListOffset {
  itemIndex: number;
  offsetInItem: number;
}

/**
 * Event emitted when list scrolls.
 */
export interface ListScrollEvent {
  scrollOffset: ScrollOffset;
  firstVisibleIndex: number;
  lastVisibleIndex: number;
}

/**
 * Props for rendering an item.
 */
export interface ListItemProps {
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

/**
 * Callback to render a single item.
 */
export type ListRenderItem<T> = (
  item: T,
  props: ListItemProps,
  cx: FlashContext
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => FlashElement<any, any>;

/**
 * Cached item height info.
 */
interface ItemHeightEntry {
  height: number | null;
  cumulativeY: number;
}

/**
 * ListState manages the state of a variable-height virtual list.
 * Can be used standalone or with the List element.
 */
export class ListState {
  private heights: ItemHeightEntry[] = [];
  private itemCount = 0;
  private estimatedItemHeight = 40;
  private totalHeight = 0;
  private lastMeasuredIndex = -1;
  private scrollHandleRef: ScrollHandle | null = null;
  private containerWidth = 0;
  private onScrollHandlers: Array<(event: ListScrollEvent) => void> = [];

  /**
   * Reset the list with a new item count.
   */
  reset(count: number): void {
    this.itemCount = count;
    this.heights = new Array(count);
    for (let i = 0; i < count; i++) {
      this.heights[i] = { height: null, cumulativeY: i * this.estimatedItemHeight };
    }
    this.lastMeasuredIndex = -1;
    this.recalculateTotalHeight();
  }

  /**
   * Set the estimated height for unmeasured items.
   */
  setEstimatedItemHeight(height: number): void {
    this.estimatedItemHeight = height;
  }

  /**
   * Set the scroll handle for external control.
   */
  setScrollHandle(handle: ScrollHandle): void {
    this.scrollHandleRef = handle;
  }

  /**
   * Get the scroll handle.
   */
  getScrollHandle(): ScrollHandle | null {
    return this.scrollHandleRef;
  }

  /**
   * Update container width and invalidate heights if changed.
   */
  updateContainerWidth(width: number): void {
    if (this.containerWidth !== width) {
      this.containerWidth = width;
      this.invalidateAllHeights();
    }
  }

  /**
   * Invalidate heights for a range of items (e.g., after data changes).
   */
  splice(startIndex: number, deleteCount: number, insertCount: number): void {
    if (deleteCount === insertCount) {
      // Just invalidate the changed range
      for (let i = startIndex; i < startIndex + deleteCount && i < this.heights.length; i++) {
        if (this.heights[i]) {
          this.heights[i]!.height = null;
        }
      }
    } else {
      // Resize the heights array
      const newHeights: ItemHeightEntry[] = [];
      for (let i = 0; i < startIndex && i < this.heights.length; i++) {
        newHeights.push(this.heights[i]!);
      }
      for (let i = 0; i < insertCount; i++) {
        newHeights.push({ height: null, cumulativeY: 0 });
      }
      for (let i = startIndex + deleteCount; i < this.heights.length; i++) {
        newHeights.push(this.heights[i]!);
      }
      this.heights = newHeights;
      this.itemCount = newHeights.length;
    }

    this.recalculateCumulativeHeights(startIndex);
    this.recalculateTotalHeight();
  }

  /**
   * Invalidate all cached heights (e.g., when container width changes).
   */
  invalidateAllHeights(): void {
    for (const entry of this.heights) {
      if (entry) {
        entry.height = null;
      }
    }
    this.lastMeasuredIndex = -1;
  }

  /**
   * Set the measured height for an item.
   */
  setItemHeight(index: number, height: number): void {
    if (index >= 0 && index < this.heights.length) {
      const entry = this.heights[index];
      if (entry && entry.height !== height) {
        entry.height = height;
        this.recalculateCumulativeHeights(index);
        this.recalculateTotalHeight();
      }
    }
  }

  /**
   * Get the height for an item (measured or estimated).
   */
  getItemHeight(index: number): number {
    if (index >= 0 && index < this.heights.length) {
      return this.heights[index]?.height ?? this.estimatedItemHeight;
    }
    return this.estimatedItemHeight;
  }

  /**
   * Get the Y position for an item.
   */
  getItemY(index: number): number {
    if (index >= 0 && index < this.heights.length) {
      return this.heights[index]?.cumulativeY ?? index * this.estimatedItemHeight;
    }
    return index * this.estimatedItemHeight;
  }

  /**
   * Get the total content height.
   */
  getTotalHeight(): number {
    return this.totalHeight;
  }

  /**
   * Get the item count.
   */
  getItemCount(): number {
    return this.itemCount;
  }

  /**
   * Find the item index at a given Y position using binary search.
   */
  findItemAtY(y: number): number {
    if (this.itemCount === 0) return 0;
    if (y <= 0) return 0;
    if (y >= this.totalHeight) return this.itemCount - 1;

    let low = 0;
    let high = this.itemCount - 1;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      const itemY = this.getItemY(mid);
      const itemHeight = this.getItemHeight(mid);

      if (y < itemY) {
        high = mid - 1;
      } else if (y >= itemY + itemHeight) {
        low = mid + 1;
      } else {
        return mid;
      }
    }

    return low;
  }

  /**
   * Calculate the visible range of items.
   */
  getVisibleRange(
    scrollY: number,
    viewportHeight: number,
    overdraw = 2
  ): { start: number; end: number } {
    if (this.itemCount === 0) {
      return { start: 0, end: 0 };
    }

    const firstVisible = this.findItemAtY(scrollY);
    const lastVisible = this.findItemAtY(scrollY + viewportHeight);

    const start = Math.max(0, firstVisible - overdraw);
    const end = Math.min(this.itemCount, lastVisible + overdraw + 1);

    return { start, end };
  }

  /**
   * Scroll to a specific offset.
   */
  scrollTo(cx: FlashContext, offset: ListOffset): void {
    if (!this.scrollHandleRef) return;

    const itemY = this.getItemY(offset.itemIndex);
    const y = itemY + offset.offsetInItem;
    const currentOffset = cx.getScrollOffset(this.scrollHandleRef);
    cx.setScrollOffset(this.scrollHandleRef, { x: currentOffset.x, y });
  }

  /**
   * Scroll to reveal an item.
   */
  scrollToRevealItem(cx: FlashContext, index: number, viewportHeight: number): void {
    if (!this.scrollHandleRef || index < 0 || index >= this.itemCount) return;

    const currentOffset = cx.getScrollOffset(this.scrollHandleRef);
    const itemY = this.getItemY(index);
    const itemHeight = this.getItemHeight(index);

    let newY = currentOffset.y;

    if (itemY < currentOffset.y) {
      newY = itemY;
    } else if (itemY + itemHeight > currentOffset.y + viewportHeight) {
      newY = itemY + itemHeight - viewportHeight;
    }

    if (newY !== currentOffset.y) {
      cx.setScrollOffset(this.scrollHandleRef, { x: currentOffset.x, y: newY });
    }
  }

  /**
   * Scroll by a pixel amount.
   */
  scrollBy(cx: FlashContext, pixels: number): void {
    if (!this.scrollHandleRef) return;
    cx.scrollBy(this.scrollHandleRef, 0, pixels);
  }

  /**
   * Register a scroll handler.
   */
  onScroll(handler: (event: ListScrollEvent) => void): () => void {
    this.onScrollHandlers.push(handler);
    return () => {
      const index = this.onScrollHandlers.indexOf(handler);
      if (index >= 0) {
        this.onScrollHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Emit scroll event to handlers.
   */
  emitScrollEvent(event: ListScrollEvent): void {
    for (const handler of this.onScrollHandlers) {
      handler(event);
    }
  }

  private recalculateCumulativeHeights(fromIndex: number): void {
    let y = fromIndex > 0 ? this.getItemY(fromIndex - 1) + this.getItemHeight(fromIndex - 1) : 0;

    for (let i = fromIndex; i < this.heights.length; i++) {
      const entry = this.heights[i];
      if (entry) {
        entry.cumulativeY = y;
        y += entry.height ?? this.estimatedItemHeight;
      }
    }
  }

  private recalculateTotalHeight(): void {
    if (this.itemCount === 0) {
      this.totalHeight = 0;
      return;
    }

    const lastIndex = this.itemCount - 1;
    this.totalHeight = this.getItemY(lastIndex) + this.getItemHeight(lastIndex);
  }
}

/**
 * State passed from requestLayout to prepaint.
 */
interface ListRequestState {
  layoutId: LayoutId;
  visibleRange: { start: number; end: number };
  renderedItems: Array<{
    index: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    element: FlashElement<any, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requestState: any;
    layoutId: LayoutId;
  }>;
  itemElementIds: GlobalElementId[];
}

/**
 * State passed from prepaint to paint.
 */
interface ListPrepaintState {
  visibleRange: { start: number; end: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderedItems: Array<{ index: number; element: FlashElement<any, any>; prepaintState: any }>;
  itemElementIds: GlobalElementId[];
  itemBounds: Bounds[];
  hitbox: Hitbox | null;
  hitTestNode: HitTestNode;
}

/**
 * Callback to measure item height from item data.
 */
export type ListMeasureItem<T> = (item: T, index: number) => number;

/**
 * List element for virtual scrolling with variable-height items.
 */
export class List<T> extends FlashElement<ListRequestState, ListPrepaintState> {
  private items: T[] = [];
  private renderItemFn: ListRenderItem<T>;
  private listState: ListState;
  private overdraw = 2;
  private styles: Partial<Styles> = {};
  private context: FlashContext | null = null;
  private alignment: ListAlignment = "top";
  private measureItemFn: ListMeasureItem<T> | null = null;

  constructor(renderItem: ListRenderItem<T>, state?: ListState) {
    super();
    this.renderItemFn = renderItem;
    this.listState = state ?? new ListState();
    this.styles.display = "flex";
    this.styles.flexDirection = "column";
    this.styles.overflow = "hidden";
  }

  /**
   * Set the items to display.
   */
  data(items: T[]): this {
    this.items = items;
    // Only reset if item count changed to preserve cached heights
    if (this.listState.getItemCount() !== items.length) {
      this.listState.reset(items.length);
    }
    return this;
  }

  /**
   * Set the ListState for external control.
   */
  state(state: ListState): this {
    this.listState = state;
    return this;
  }

  /**
   * Get the ListState.
   */
  getState(): ListState {
    return this.listState;
  }

  /**
   * Set the estimated height for unmeasured items.
   */
  estimatedItemHeight(height: number): this {
    this.listState.setEstimatedItemHeight(height);
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
    this.listState.setScrollHandle(handle);
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
   * Set alignment (top or bottom).
   */
  align(alignment: ListAlignment): this {
    this.alignment = alignment;
    return this;
  }

  /**
   * Set a callback to measure item height from item data.
   * This is called for items that haven't been measured yet.
   */
  measureItem(fn: ListMeasureItem<T>): this {
    this.measureItemFn = fn;
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
    this.styles.backgroundColor = toColorObject(color);
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
   * Set border radius.
   */
  rounded(v: number): this {
    this.styles.borderRadius = v;
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<ListRequestState> {
    // Get actual scroll offset if we have a scroll handle
    const scrollHandle = this.listState.getScrollHandle();
    const scrollOffset = scrollHandle ? cx.getScrollOffset(scrollHandle) : { x: 0, y: 0 };

    // Estimate visible range based on stored heights
    const estimatedViewportHeight = 600;
    const visibleRange = this.listState.getVisibleRange(
      scrollOffset.y,
      estimatedViewportHeight,
      this.overdraw
    );

    const renderedItems: Array<{
      index: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: FlashElement<any, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requestState: any;
      layoutId: LayoutId;
    }> = [];
    const itemElementIds: GlobalElementId[] = [];

    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const item = this.items[i];
      if (item === undefined) continue;

      const props: ListItemProps = {
        index: i,
        isFirst: i === 0,
        isLast: i === this.items.length - 1,
      };

      const element = this.context ? this.renderItemFn(item, props, this.context) : null;

      if (!element) continue;

      const childId = cx.allocateChildId();
      itemElementIds.push(childId);

      const childCx = { ...cx, elementId: childId };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (element as FlashElement<any, any>).requestLayout(childCx);
      renderedItems.push({
        index: i,
        element,
        requestState: result.requestState,
        layoutId: result.layoutId,
      });
    }

    // Create an inner measurement container that holds items for height computation
    // This container is positioned absolutely so it doesn't affect the outer container's flex sizing
    // Items are stacked vertically to get their natural heights computed
    const itemLayoutIds = renderedItems.map((item) => item.layoutId);
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
        visibleRange,
        renderedItems,
        itemElementIds,
      },
    };
  }

  prepaint(cx: PrepaintContext, bounds: Bounds, requestState: ListRequestState): ListPrepaintState {
    const { renderedItems, itemElementIds } = requestState;

    // Update container width for height recalculation
    this.listState.updateContainerWidth(bounds.width);

    // Get actual scroll offset
    const scrollHandle = this.listState.getScrollHandle();
    const scrollOffset: ScrollOffset = scrollHandle
      ? cx.getScrollOffset(scrollHandle)
      : { x: 0, y: 0 };

    // Recalculate visible range with actual viewport
    const visibleRange = this.listState.getVisibleRange(
      scrollOffset.y,
      bounds.height,
      this.overdraw
    );

    // Insert hitbox
    const hitbox = cx.insertHitbox(bounds, HitboxBehavior.Normal);

    // Get padding values for content area
    const paddingTop = this.styles.paddingTop ?? 0;
    const paddingBottom = this.styles.paddingBottom ?? 0;
    const paddingLeft = this.styles.paddingLeft ?? 0;
    const paddingRight = this.styles.paddingRight ?? 0;

    // Update scroll content size (include padding in total content height)
    if (scrollHandle) {
      const totalHeight = this.listState.getTotalHeight() + paddingTop + paddingBottom;
      cx.updateScrollContentSize(
        scrollHandle,
        { width: bounds.width, height: totalHeight },
        { width: bounds.width, height: bounds.height },
        { x: bounds.x, y: bounds.y }
      );
    }

    // Calculate item bounds and prepaint
    const itemBounds: Bounds[] = [];

    const prepaintedItems: Array<{
      index: number;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      element: FlashElement<any, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prepaintState: any;
    }> = [];

    // First pass: get actual heights from Taffy-computed layout
    // This uses the real measured heights, not estimates
    for (let i = 0; i < renderedItems.length; i++) {
      const { index, layoutId } = renderedItems[i]!;
      const layoutBounds = cx.getBounds(layoutId);
      this.listState.setItemHeight(index, layoutBounds.height);
    }

    // Calculate content area (bounds minus padding)
    const contentX = bounds.x + paddingLeft;
    const contentY = bounds.y + paddingTop;
    const contentWidth = bounds.width - paddingLeft - paddingRight;

    // Second pass: position items and run prepaint
    for (let i = 0; i < renderedItems.length; i++) {
      const { index, element, requestState: childRequestState } = renderedItems[i]!;
      const childId = itemElementIds[i]!;

      // Get item position from list state, adjusted for scroll
      const itemY = this.listState.getItemY(index) - scrollOffset.y;

      // Use actual measured height from layout
      const itemHeight = this.listState.getItemHeight(index);

      const itemBound: Bounds = {
        x: contentX,
        y: contentY + itemY,
        width: contentWidth,
        height: itemHeight,
      };
      itemBounds.push(itemBound);

      const childCx = cx.withElementId(childId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prepaintState = (element as FlashElement<any, any>).prepaint(
        childCx,
        itemBound,
        childRequestState
      );
      prepaintedItems.push({ index, element, prepaintState });
    }

    // Emit scroll event
    this.listState.emitScrollEvent({
      scrollOffset,
      firstVisibleIndex: visibleRange.start,
      lastVisibleIndex: visibleRange.end - 1,
    });

    const hitTestNode: HitTestNode = {
      bounds,
      handlers: {},
      focusHandle: null,
      scrollHandle,
      keyContext: null,
      children: [],
    };

    return {
      visibleRange,
      renderedItems: prepaintedItems,
      itemElementIds,
      itemBounds,
      hitbox,
      hitTestNode,
    };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: ListPrepaintState): void {
    const { renderedItems, itemElementIds, itemBounds } = prepaintState;

    // Paint background
    if (this.styles.backgroundColor) {
      cx.paintRect(bounds, this.styles);
    }

    // Clip and paint items
    cx.withContentMask(
      {
        bounds,
        cornerRadius: this.styles.borderRadius ?? 0,
      },
      () => {
        for (let i = 0; i < renderedItems.length; i++) {
          const { element, prepaintState: childPrepaintState } = renderedItems[i]!;
          const childBound = itemBounds[i]!;
          const childId = itemElementIds[i]!;

          // Skip items outside viewport
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
      scrollHandle: this.listState.getScrollHandle(),
      keyContext: null,
      children: [],
    };
  }
}

/**
 * Factory function to create a variable-height list.
 */
export function list<T>(renderItem: ListRenderItem<T>, state?: ListState): List<T> {
  return new List(renderItem, state);
}

/**
 * Factory function to create a ListState.
 */
export function createListState(): ListState {
  return new ListState();
}
