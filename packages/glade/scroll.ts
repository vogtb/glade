import type { Point } from "./point";
import type { Size } from "./size";

/**
 * Scroll offset representing the current scroll position.
 */
export interface ScrollOffset {
  x: number;
  y: number;
}

/**
 * Scroll state for a scroll container.
 */
export interface ScrollState {
  offset: ScrollOffset;
  contentSize: Size;
  viewportSize: Size;
  velocityX: number;
  velocityY: number;
  viewportOrigin: Point;
}

/**
 * Create an empty scroll state.
 */
export function createScrollState(): ScrollState {
  return {
    offset: { x: 0, y: 0 },
    contentSize: { width: 0, height: 0 },
    viewportSize: { width: 0, height: 0 },
    velocityX: 0,
    velocityY: 0,
    viewportOrigin: { x: 0, y: 0 },
  };
}

/**
 * Clamp scroll offset to valid range based on content and viewport sizes.
 */
export function clampScrollOffset(state: ScrollState): ScrollOffset {
  const maxX = Math.max(0, state.contentSize.width - state.viewportSize.width);
  const maxY = Math.max(0, state.contentSize.height - state.viewportSize.height);
  return {
    x: Math.max(0, Math.min(state.offset.x, maxX)),
    y: Math.max(0, Math.min(state.offset.y, maxY)),
  };
}

/**
 * Check if content is scrollable in either direction.
 */
export function isScrollable(state: ScrollState): { x: boolean; y: boolean } {
  return {
    x: state.contentSize.width > state.viewportSize.width,
    y: state.contentSize.height > state.viewportSize.height,
  };
}
