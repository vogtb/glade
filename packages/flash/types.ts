/**
 * Core type definitions for Flash.
 */

// Branded types for type-safe IDs
declare const __entityIdBrand: unique symbol;
export type EntityId = number & { [__entityIdBrand]: true };

declare const __windowIdBrand: unique symbol;
export type WindowId = number & { [__windowIdBrand]: true };

declare const __focusIdBrand: unique symbol;
export type FocusId = number & { [__focusIdBrand]: true };

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
