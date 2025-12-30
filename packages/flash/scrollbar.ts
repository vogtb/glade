/**
 * Scrollbar rendering and interaction for Flash.
 *
 * Provides scrollbar configuration, thumb position calculations,
 * and rendering utilities for scroll containers.
 */

import type { ColorObject } from "@glade/utils";
import { toColorObject, type Color, type Bounds, type ScrollHandleId } from "./types.ts";

/**
 * When to show scrollbars.
 */
export type ScrollbarVisibility = "always" | "hover" | "scroll" | "never";

/**
 * Scrollbar appearance and behavior configuration.
 */
export interface ScrollbarConfig {
  /** Track width in pixels. Default: 8 */
  width: number;
  /** Minimum thumb size in pixels. Default: 20 */
  minThumbSize: number;
  /** Track background color */
  trackColor: Color;
  /** Thumb color in normal state */
  thumbColor: Color;
  /** Thumb color when hovered */
  thumbHoverColor: Color;
  /** Thumb color when being dragged */
  thumbActiveColor: Color;
  /** Corner radius for thumb. Default: 4 */
  cornerRadius: number;
  /** Margin from container edge. Default: 2 */
  margin: number;
  /** When to show the scrollbar */
  visibility: ScrollbarVisibility;
}

/**
 * Default scrollbar configuration with subtle, semi-transparent styling.
 */
export const DEFAULT_SCROLLBAR_CONFIG: ScrollbarConfig = {
  width: 8,
  minThumbSize: 20,
  trackColor: { r: 0.1, g: 0.1, b: 0.1, a: 0.2 },
  thumbColor: { r: 0.5, g: 0.5, b: 0.5, a: 0.5 },
  thumbHoverColor: { r: 0.6, g: 0.6, b: 0.6, a: 0.7 },
  thumbActiveColor: { r: 0.7, g: 0.7, b: 0.7, a: 0.9 },
  cornerRadius: 4,
  margin: 2,
  visibility: "hover",
};

export type ResolvedScrollbarConfig = Omit<
  ScrollbarConfig,
  "trackColor" | "thumbColor" | "thumbHoverColor" | "thumbActiveColor"
> & {
  trackColor: ColorObject;
  thumbColor: ColorObject;
  thumbHoverColor: ColorObject;
  thumbActiveColor: ColorObject;
};

export function resolveScrollbarConfig(
  overrides?: Partial<ScrollbarConfig>
): ResolvedScrollbarConfig {
  const merged: ScrollbarConfig = { ...DEFAULT_SCROLLBAR_CONFIG, ...overrides };
  return {
    ...merged,
    trackColor: toColorObject(merged.trackColor),
    thumbColor: toColorObject(merged.thumbColor),
    thumbHoverColor: toColorObject(merged.thumbHoverColor),
    thumbActiveColor: toColorObject(merged.thumbActiveColor),
  };
}

/**
 * State for tracking an active scrollbar thumb drag operation.
 */
export interface ScrollbarDragState {
  /** Which axis is being dragged */
  axis: "x" | "y";
  /** The scroll handle being controlled */
  scrollHandleId: ScrollHandleId;
  /** Scroll offset when drag started */
  startOffset: number;
  /** Mouse position when drag started */
  startMousePos: number;
  /** Track length for ratio calculation */
  trackLength: number;
  /** Thumb size for ratio calculation */
  thumbSize: number;
  /** Maximum scroll value */
  maxScroll: number;
}

/**
 * Result of thumb metrics calculation.
 */
export interface ThumbMetrics {
  /** Size of the thumb in pixels */
  thumbSize: number;
  /** Position of the thumb from track start */
  thumbPosition: number;
  /** Whether scrollbar should be visible (content exceeds viewport) */
  isScrollable: boolean;
}

/**
 * Calculate scrollbar thumb size and position from scroll state.
 *
 * @param contentSize - Total content size along the scroll axis
 * @param viewportSize - Visible viewport size along the scroll axis
 * @param scrollOffset - Current scroll offset
 * @param trackLength - Length of the scrollbar track
 * @param minThumbSize - Minimum thumb size to maintain usability
 * @returns Thumb metrics including size and position
 */
export function calculateThumbMetrics(
  contentSize: number,
  viewportSize: number,
  scrollOffset: number,
  trackLength: number,
  minThumbSize: number
): ThumbMetrics {
  // Not scrollable if content fits in viewport
  if (contentSize <= viewportSize) {
    return { thumbSize: 0, thumbPosition: 0, isScrollable: false };
  }

  // Calculate thumb size proportional to visible ratio
  const visibleRatio = viewportSize / contentSize;
  const naturalThumbSize = trackLength * visibleRatio;
  const thumbSize = Math.max(minThumbSize, naturalThumbSize);

  // Calculate thumb position from scroll ratio
  const maxScroll = contentSize - viewportSize;
  const scrollRatio = maxScroll > 0 ? scrollOffset / maxScroll : 0;
  const maxThumbPosition = trackLength - thumbSize;
  const thumbPosition = Math.max(0, Math.min(scrollRatio * maxThumbPosition, maxThumbPosition));

  return { thumbSize, thumbPosition, isScrollable: true };
}

/**
 * Convert thumb position to scroll offset (for drag operations).
 *
 * @param thumbPosition - Current thumb position from track start
 * @param thumbSize - Size of the thumb
 * @param trackLength - Length of the scrollbar track
 * @param contentSize - Total content size
 * @param viewportSize - Viewport size
 * @returns Corresponding scroll offset
 */
export function thumbPositionToScrollOffset(
  thumbPosition: number,
  thumbSize: number,
  trackLength: number,
  contentSize: number,
  viewportSize: number
): number {
  const maxScroll = contentSize - viewportSize;
  if (maxScroll <= 0) return 0;

  const maxThumbPosition = trackLength - thumbSize;
  if (maxThumbPosition <= 0) return 0;

  const scrollRatio = thumbPosition / maxThumbPosition;
  return Math.max(0, Math.min(scrollRatio * maxScroll, maxScroll));
}

/**
 * Calculate scroll offset from a track click position.
 * Centers the thumb at the click position.
 *
 * @param clickPosition - Click position relative to track start
 * @param thumbSize - Size of the thumb
 * @param trackLength - Length of the scrollbar track
 * @param contentSize - Total content size
 * @param viewportSize - Viewport size
 * @returns Scroll offset that centers thumb at click position
 */
export function trackClickToScrollOffset(
  clickPosition: number,
  thumbSize: number,
  trackLength: number,
  contentSize: number,
  viewportSize: number
): number {
  // Center thumb at click position
  const targetThumbPosition = clickPosition - thumbSize / 2;
  const maxThumbPosition = trackLength - thumbSize;
  const clampedThumbPosition = Math.max(0, Math.min(targetThumbPosition, maxThumbPosition));

  return thumbPositionToScrollOffset(
    clampedThumbPosition,
    thumbSize,
    trackLength,
    contentSize,
    viewportSize
  );
}

/**
 * Calculate scroll offset from thumb drag delta.
 *
 * @param dragState - Current drag state
 * @param currentMousePos - Current mouse position
 * @returns New scroll offset
 */
export function calculateDragScrollOffset(
  dragState: ScrollbarDragState,
  currentMousePos: number
): number {
  const mouseDelta = currentMousePos - dragState.startMousePos;
  const maxThumbTravel = dragState.trackLength - dragState.thumbSize;

  if (maxThumbTravel <= 0) return dragState.startOffset;

  const scrollDelta = (mouseDelta / maxThumbTravel) * dragState.maxScroll;
  const newOffset = dragState.startOffset + scrollDelta;

  return Math.max(0, Math.min(newOffset, dragState.maxScroll));
}

/**
 * Calculate the bounds for a vertical scrollbar track.
 *
 * @param containerBounds - Container element bounds
 * @param config - Scrollbar configuration
 * @param hasHorizontal - Whether horizontal scrollbar is also visible
 * @returns Track bounds
 */
export function calculateVerticalTrackBounds(
  containerBounds: Bounds,
  config: ScrollbarConfig,
  hasHorizontal: boolean
): Bounds {
  const trackHeight =
    containerBounds.height - config.margin * 2 - (hasHorizontal ? config.width + config.margin : 0);

  return {
    x: containerBounds.x + containerBounds.width - config.width - config.margin,
    y: containerBounds.y + config.margin,
    width: config.width,
    height: Math.max(0, trackHeight),
  };
}

/**
 * Calculate the bounds for a horizontal scrollbar track.
 *
 * @param containerBounds - Container element bounds
 * @param config - Scrollbar configuration
 * @param hasVertical - Whether vertical scrollbar is also visible
 * @returns Track bounds
 */
export function calculateHorizontalTrackBounds(
  containerBounds: Bounds,
  config: ScrollbarConfig,
  hasVertical: boolean
): Bounds {
  const trackWidth =
    containerBounds.width - config.margin * 2 - (hasVertical ? config.width + config.margin : 0);

  return {
    x: containerBounds.x + config.margin,
    y: containerBounds.y + containerBounds.height - config.width - config.margin,
    width: Math.max(0, trackWidth),
    height: config.width,
  };
}

/**
 * Calculate thumb bounds within a track.
 *
 * @param trackBounds - Track bounds
 * @param thumbPosition - Thumb position from track start
 * @param thumbSize - Thumb size
 * @param axis - Scroll axis
 * @returns Thumb bounds
 */
export function calculateThumbBounds(
  trackBounds: Bounds,
  thumbPosition: number,
  thumbSize: number,
  axis: "x" | "y"
): Bounds {
  if (axis === "y") {
    return {
      x: trackBounds.x,
      y: trackBounds.y + thumbPosition,
      width: trackBounds.width,
      height: thumbSize,
    };
  } else {
    return {
      x: trackBounds.x + thumbPosition,
      y: trackBounds.y,
      width: thumbSize,
      height: trackBounds.height,
    };
  }
}

/**
 * Check if a point is within thumb bounds.
 *
 * @param point - Point to test
 * @param thumbBounds - Thumb bounds
 * @returns True if point is within thumb
 */
export function isPointInThumb(point: { x: number; y: number }, thumbBounds: Bounds): boolean {
  return (
    point.x >= thumbBounds.x &&
    point.x < thumbBounds.x + thumbBounds.width &&
    point.y >= thumbBounds.y &&
    point.y < thumbBounds.y + thumbBounds.height
  );
}

/**
 * Get the appropriate thumb color based on interaction state.
 *
 * @param config - Scrollbar configuration
 * @param isHovered - Whether thumb is hovered
 * @param isDragging - Whether thumb is being dragged
 * @returns Thumb color
 */
export function getThumbColor(
  config: ResolvedScrollbarConfig,
  isHovered: boolean,
  isDragging: boolean
): ColorObject {
  if (isDragging) return config.thumbActiveColor;
  if (isHovered) return config.thumbHoverColor;
  return config.thumbColor;
}
