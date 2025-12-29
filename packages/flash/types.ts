/**
 * Core type definitions for Flash.
 *
 * TODO: I'm not sure having a types.ts file is good. I know it's common
 * practice for ts repos, but it smells too much like a const.ts file, which
 * is bad. Maybe split these things out and put the types where they live.
 */

// Branded types for type-safe IDs
declare const __entityIdBrand: unique symbol;
export type EntityId = number & { [__entityIdBrand]: true };

declare const __windowIdBrand: unique symbol;
export type WindowId = number & { [__windowIdBrand]: true };

declare const __focusIdBrand: unique symbol;
export type FocusId = number & { [__focusIdBrand]: true };

declare const __scrollHandleIdBrand: unique symbol;
export type ScrollHandleId = number & { [__scrollHandleIdBrand]: true };

/**
 * 2D point.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * 2D size.
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Axis-aligned bounding box.
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Check if a point is inside bounds.
 */
export function boundsContains(bounds: Bounds, point: Point): boolean {
  return (
    point.x >= bounds.x &&
    point.x < bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y < bounds.y + bounds.height
  );
}

/**
 * RGBA color with components in 0-1 range.
 *
 * TODO: We should probably make Color a string, number, or struct, then use this
 * for internal representations, which would allow Elements to accept `.color(c)`
 * with a color arg that is more flexible.
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Create a color from a hex value (e.g., 0xFF5500).
 */
export function rgb(hex: number): Color {
  return {
    r: ((hex >> 16) & 0xff) / 255,
    g: ((hex >> 8) & 0xff) / 255,
    b: (hex & 0xff) / 255,
    a: 1,
  };
}

/**
 * Create a color from RGBA hex value (e.g., 0xFF550080).
 */
export function rgba(hex: number): Color {
  return {
    r: ((hex >> 24) & 0xff) / 255,
    g: ((hex >> 16) & 0xff) / 255,
    b: ((hex >> 8) & 0xff) / 255,
    a: (hex & 0xff) / 255,
  };
}

/**
 * Create a color from individual components (0-255).
 */
export function color(r: number, g: number, b: number, a = 255): Color {
  return {
    r: r / 255,
    g: g / 255,
    b: b / 255,
    a: a / 255,
  };
}

/**
 * Async task handle.
 */
export interface FlashTask<T> {
  readonly id: number;
  cancel(): void;
  then<R>(onFulfilled: (value: T) => R): FlashTask<R>;
}

/**
 * Content mask for clipping regions.
 * Clips content to the specified bounds with optional rounded corners.
 */
export interface ContentMask {
  bounds: Bounds;
  cornerRadius: number;
}

/**
 * Intersect two bounds, returning the overlapping region.
 * Returns null if bounds don't overlap.
 */
export function boundsIntersect(a: Bounds, b: Bounds): Bounds | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  if (right <= x || bottom <= y) {
    return null;
  }

  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Check if bounds are empty (zero or negative area).
 */
export function boundsIsEmpty(bounds: Bounds): boolean {
  return bounds.width <= 0 || bounds.height <= 0;
}

// ============ Scroll Types ============

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

// ============ 2D Transforms ============

/**
 * 2D affine transformation matrix.
 *
 * Represents a 2x3 matrix for 2D transforms:
 * | a  b  tx |
 * | c  d  ty |
 * | 0  0  1  |
 *
 * Where:
 * - a, d: scale
 * - b, c: rotation/skew
 * - tx, ty: translation
 */
export interface TransformationMatrix {
  a: number; // scale x / cos(rotation)
  b: number; // skew y / sin(rotation)
  c: number; // skew x / -sin(rotation)
  d: number; // scale y / cos(rotation)
  tx: number; // translate x
  ty: number; // translate y
}

/**
 * Identity transform (no transformation).
 */
export const IDENTITY_TRANSFORM: TransformationMatrix = {
  a: 1,
  b: 0,
  c: 0,
  d: 1,
  tx: 0,
  ty: 0,
};

/**
 * Create a translation transform.
 */
export function translateTransform(x: number, y: number): TransformationMatrix {
  return { a: 1, b: 0, c: 0, d: 1, tx: x, ty: y };
}

/**
 * Create a scale transform.
 */
export function scaleTransform(sx: number, sy?: number): TransformationMatrix {
  const scaleY = sy ?? sx;
  return { a: sx, b: 0, c: 0, d: scaleY, tx: 0, ty: 0 };
}

/**
 * Create a rotation transform (angle in radians).
 */
export function rotateTransform(angle: number): TransformationMatrix {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { a: cos, b: sin, c: -sin, d: cos, tx: 0, ty: 0 };
}

/**
 * Multiply two transforms (compose them).
 * Result applies `a` first, then `b`.
 */
export function multiplyTransform(
  a: TransformationMatrix,
  b: TransformationMatrix
): TransformationMatrix {
  return {
    a: a.a * b.a + a.b * b.c,
    b: a.a * b.b + a.b * b.d,
    c: a.c * b.a + a.d * b.c,
    d: a.c * b.b + a.d * b.d,
    tx: a.a * b.tx + a.b * b.ty + a.tx,
    ty: a.c * b.tx + a.d * b.ty + a.ty,
  };
}

/**
 * Apply a transform to a point.
 */
export function transformPoint(transform: TransformationMatrix, point: Point): Point {
  return {
    x: transform.a * point.x + transform.b * point.y + transform.tx,
    y: transform.c * point.x + transform.d * point.y + transform.ty,
  };
}

/**
 * Create a transform that rotates around a specific point.
 */
export function rotateAroundTransform(
  angle: number,
  centerX: number,
  centerY: number
): TransformationMatrix {
  const toOrigin = translateTransform(-centerX, -centerY);
  const rotate = rotateTransform(angle);
  const backToCenter = translateTransform(centerX, centerY);
  return multiplyTransform(multiplyTransform(toOrigin, rotate), backToCenter);
}

/**
 * Create a transform that scales around a specific point.
 */
export function scaleAroundTransform(
  sx: number,
  sy: number,
  centerX: number,
  centerY: number
): TransformationMatrix {
  const toOrigin = translateTransform(-centerX, -centerY);
  const scale = scaleTransform(sx, sy);
  const backToCenter = translateTransform(centerX, centerY);
  return multiplyTransform(multiplyTransform(toOrigin, scale), backToCenter);
}
