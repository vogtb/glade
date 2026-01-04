import type { Point } from "./point";

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
