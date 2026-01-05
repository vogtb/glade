/**
 * Path rendering for Glade. Provides a PathBuilder API for creating vector
 * paths and a GPU pipeline for rendering them. Paths are tessellated into
 * triangles using ear clipping.
 *
 * NOTE/TODO: I wrote this very fast, and uses a couple of different libraries
 * for references, but there are likely parts of this file that are straight-up
 * wrong.
 */

import { GPUBufferUsage } from "@glade/core/webgpu";
import { log } from "@glade/logging";
import { type Color, toColorObject } from "@glade/utils";

import type { Bounds } from "./bounds.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";
import type { PathPrimitive, PathVertex } from "./scene.ts";

/**
 * Path command types.
 */
export type PathCommand =
  | { type: "moveTo"; x: number; y: number }
  | { type: "lineTo"; x: number; y: number }
  | { type: "quadTo"; cx: number; cy: number; x: number; y: number }
  | { type: "cubicTo"; c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }
  | {
      type: "arcTo";
      rx: number;
      ry: number;
      rotation: number;
      largeArc: boolean;
      sweep: boolean;
      x: number;
      y: number;
    }
  | { type: "close" };

/**
 * A path that has been tessellated for rendering.
 */
export interface TessellatedPath {
  vertices: PathVertex[];
  indices: number[];
  bounds: Bounds;
}

/**
 * Builder for creating paths with a canvas-like API.
 */
export class PathBuilder {
  private commands: PathCommand[] = [];
  private currentX = 0;
  private currentY = 0;
  private startX = 0;
  private startY = 0;

  /**
   * Move to a new position without drawing.
   */
  moveTo(x: number, y: number): this {
    this.commands.push({ type: "moveTo", x, y });
    this.currentX = x;
    this.currentY = y;
    this.startX = x;
    this.startY = y;
    return this;
  }

  /**
   * Draw a line to a new position.
   */
  lineTo(x: number, y: number): this {
    this.commands.push({ type: "lineTo", x, y });
    this.currentX = x;
    this.currentY = y;
    return this;
  }

  /**
   * Draw a quadratic Bezier curve to a new position.
   */
  quadTo(cx: number, cy: number, x: number, y: number): this {
    this.commands.push({ type: "quadTo", cx, cy, x, y });
    this.currentX = x;
    this.currentY = y;
    return this;
  }

  /**
   * Draw a cubic Bezier curve to a new position.
   */
  cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): this {
    this.commands.push({ type: "cubicTo", c1x, c1y, c2x, c2y, x, y });
    this.currentX = x;
    this.currentY = y;
    return this;
  }

  /**
   * Draw an arc to a new position.
   */
  arcTo(
    rx: number,
    ry: number,
    rotation: number,
    largeArc: boolean,
    sweep: boolean,
    x: number,
    y: number
  ): this {
    this.commands.push({ type: "arcTo", rx, ry, rotation, largeArc, sweep, x, y });
    this.currentX = x;
    this.currentY = y;
    return this;
  }

  /**
   * Close the current subpath by drawing a line back to the start.
   */
  close(): this {
    this.commands.push({ type: "close" });
    this.currentX = this.startX;
    this.currentY = this.startY;
    return this;
  }

  /**
   * Add a rectangle to the path.
   */
  rect(x: number, y: number, width: number, height: number): this {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.close();
    return this;
  }

  /**
   * Add a rounded rectangle to the path.
   */
  roundRect(x: number, y: number, width: number, height: number, radius: number): this {
    const r = Math.min(radius, width / 2, height / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + width - r, y);
    this.quadTo(x + width, y, x + width, y + r);
    this.lineTo(x + width, y + height - r);
    this.quadTo(x + width, y + height, x + width - r, y + height);
    this.lineTo(x + r, y + height);
    this.quadTo(x, y + height, x, y + height - r);
    this.lineTo(x, y + r);
    this.quadTo(x, y, x + r, y);
    this.close();
    return this;
  }

  /**
   * Add a circle to the path.
   */
  circle(cx: number, cy: number, r: number): this {
    return this.ellipse(cx, cy, r, r);
  }

  // (4/3) * tan(pi/8) - magic number for cubic Bezier circle approximation
  private static CUBIC_BEZIER_CIRCLE_APPROX = 0.5522847498;

  /**
   * Add an ellipse to the path using cubic Bezier approximation.
   */
  ellipse(cx: number, cy: number, rx: number, ry: number): this {
    const kx = rx * PathBuilder.CUBIC_BEZIER_CIRCLE_APPROX;
    const ky = ry * PathBuilder.CUBIC_BEZIER_CIRCLE_APPROX;

    this.moveTo(cx + rx, cy);
    this.cubicTo(cx + rx, cy + ky, cx + kx, cy + ry, cx, cy + ry);
    this.cubicTo(cx - kx, cy + ry, cx - rx, cy + ky, cx - rx, cy);
    this.cubicTo(cx - rx, cy - ky, cx - kx, cy - ry, cx, cy - ry);
    this.cubicTo(cx + kx, cy - ry, cx + rx, cy - ky, cx + rx, cy);
    this.close();
    return this;
  }

  /**
   * Add a regular polygon to the path.
   */
  polygon(cx: number, cy: number, radius: number, sides: number): this {
    if (sides < 3) {
      return this;
    }
    const angleStep = (Math.PI * 2) / sides;
    // Start at top
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < sides; i++) {
      const angle = startAngle + i * angleStep;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    }
    this.close();
    return this;
  }

  /**
   * Add a star shape to the path.
   */
  star(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number): this {
    if (points < 2) {
      return this;
    }
    const angleStep = Math.PI / points;
    const startAngle = -Math.PI / 2;

    for (let i = 0; i < points * 2; i++) {
      const angle = startAngle + i * angleStep;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        this.moveTo(x, y);
      } else {
        this.lineTo(x, y);
      }
    }
    this.close();
    return this;
  }

  /**
   * Get the commands in this path.
   */
  getCommands(): readonly PathCommand[] {
    return this.commands;
  }

  /**
   * Clear the path commands.
   */
  clear(): this {
    this.commands = [];
    this.currentX = 0;
    this.currentY = 0;
    this.startX = 0;
    this.startY = 0;
    return this;
  }

  /**
   * Tessellate the path into triangles.
   */
  tessellate(): TessellatedPath {
    const subpaths = this.flattenToSubpaths();
    if (subpaths.length === 0) {
      return { vertices: [], indices: [], bounds: { x: 0, y: 0, width: 0, height: 0 } };
    }

    const allVertices: Array<{ x: number; y: number }> = [];
    const allIndices: number[] = [];
    let vertexOffset = 0;

    for (const points of subpaths) {
      if (points.length < 3) {
        continue;
      }

      const indices = triangulate(points);
      for (const idx of indices) {
        allIndices.push(idx + vertexOffset);
      }
      allVertices.push(...points);
      vertexOffset += points.length;
    }

    const bounds = computeBounds(allVertices);
    return { vertices: allVertices, indices: allIndices, bounds };
  }

  /**
   * Create a PathPrimitive for rendering.
   */
  build(color: Color): PathPrimitive {
    const tessellated = this.tessellate();
    return {
      vertices: tessellated.vertices,
      indices: tessellated.indices,
      color: toColorObject(color),
      bounds: tessellated.bounds,
    };
  }

  /**
   * Flatten the path commands into separate subpaths. Each subpath starts
   * with a moveTo and ends with close or the next moveTo.
   */
  private flattenToSubpaths(): Array<Array<{ x: number; y: number }>> {
    const subpaths: Array<Array<{ x: number; y: number }>> = [];
    let points: Array<{ x: number; y: number }> = [];
    let currentX = 0;
    let currentY = 0;
    let startX = 0;
    let startY = 0;

    const finishSubpath = () => {
      if (points.length >= 3) {
        subpaths.push(points);
      }
      points = [];
    };

    for (const cmd of this.commands) {
      switch (cmd.type) {
        case "moveTo":
          finishSubpath();
          currentX = cmd.x;
          currentY = cmd.y;
          startX = cmd.x;
          startY = cmd.y;
          points.push({ x: cmd.x, y: cmd.y });
          break;

        case "lineTo":
          if (points.length === 0) {
            points.push({ x: currentX, y: currentY });
          }
          points.push({ x: cmd.x, y: cmd.y });
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "quadTo":
          flattenQuadratic(points, currentX, currentY, cmd.cx, cmd.cy, cmd.x, cmd.y);
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "cubicTo":
          flattenCubic(
            points,
            currentX,
            currentY,
            cmd.c1x,
            cmd.c1y,
            cmd.c2x,
            cmd.c2y,
            cmd.x,
            cmd.y
          );
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "arcTo":
          flattenArc(
            points,
            currentX,
            currentY,
            cmd.rx,
            cmd.ry,
            cmd.rotation,
            cmd.largeArc,
            cmd.sweep,
            cmd.x,
            cmd.y
          );
          currentX = cmd.x;
          currentY = cmd.y;
          break;

        case "close":
          if (points.length > 0 && (currentX !== startX || currentY !== startY)) {
            points.push({ x: startX, y: startY });
          }
          finishSubpath();
          currentX = startX;
          currentY = startY;
          break;
      }
    }

    finishSubpath();
    return subpaths;
  }
}

/**
 * Compute the bounding box of a set of points.
 */
function computeBounds(points: Array<{ x: number; y: number }>): Bounds {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = points[0]!.x;
  let minY = points[0]!.y;
  let maxX = points[0]!.x;
  let maxY = points[0]!.y;

  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Flatten a quadratic Bezier curve into line segments.
 */
function flattenQuadratic(
  points: Array<{ x: number; y: number }>,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  tolerance = 0.5
): void {
  const steps = Math.max(2, Math.ceil(Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) / tolerance));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    points.push({ x, y });
  }
}

/**
 * Flatten a cubic Bezier curve into line segments.
 */
function flattenCubic(
  points: Array<{ x: number; y: number }>,
  x0: number,
  y0: number,
  c1x: number,
  c1y: number,
  c2x: number,
  c2y: number,
  x1: number,
  y1: number,
  tolerance = 0.5
): void {
  const steps = Math.max(2, Math.ceil(Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2) / tolerance));

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const x = mt * mt * mt * x0 + 3 * mt * mt * t * c1x + 3 * mt * t * t * c2x + t * t * t * x1;
    const y = mt * mt * mt * y0 + 3 * mt * mt * t * c1y + 3 * mt * t * t * c2y + t * t * t * y1;
    points.push({ x, y });
  }
}

/**
 * Flatten an arc into line segments.
 */
function flattenArc(
  points: Array<{ x: number; y: number }>,
  x0: number,
  y0: number,
  rx: number,
  ry: number,
  rotation: number,
  largeArc: boolean,
  sweep: boolean,
  x1: number,
  y1: number
): void {
  if (rx === 0 || ry === 0) {
    points.push({ x: x1, y: y1 });
    return;
  }

  const phi = (rotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (x0 - x1) / 2;
  const dy = (y0 - y1) / 2;

  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  let rxSq = rx * rx;
  let rySq = ry * ry;
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;

  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  let sq = (rxSq * rySq - rxSq * y1pSq - rySq * x1pSq) / (rxSq * y1pSq + rySq * x1pSq);
  if (sq < 0) {
    sq = 0;
  }
  const coef = (largeArc !== sweep ? 1 : -1) * Math.sqrt(sq);

  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x1) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y1) / 2;

  const theta1 = vectorAngle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let dtheta = vectorAngle(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry
  );

  if (!sweep && dtheta > 0) {
    dtheta -= 2 * Math.PI;
  } else if (sweep && dtheta < 0) {
    dtheta += 2 * Math.PI;
  }

  const steps = Math.max(2, Math.ceil(Math.abs(dtheta) / (Math.PI / 16)));

  for (let i = 1; i <= steps; i++) {
    const theta = theta1 + (dtheta * i) / steps;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const x = cosPhi * rx * cosTheta - sinPhi * ry * sinTheta + cx;
    const y = sinPhi * rx * cosTheta + cosPhi * ry * sinTheta + cy;
    points.push({ x, y });
  }
}

/**
 * Calculate angle between two vectors.
 */
function vectorAngle(ux: number, uy: number, vx: number, vy: number): number {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const dot = ux * vx + uy * vy;
  const lenU = Math.sqrt(ux * ux + uy * uy);
  const lenV = Math.sqrt(vx * vx + vy * vy);
  let cosVal = dot / (lenU * lenV);
  if (cosVal > 1) {
    cosVal = 1;
  }
  if (cosVal < -1) {
    cosVal = -1;
  }
  return sign * Math.acos(cosVal);
}

/**
 * Triangulate a simple polygon using ear clipping algorithm. Returns indices
 * into the points array.
 */
function triangulate(points: Array<{ x: number; y: number }>): number[] {
  const n = points.length;
  if (n < 3) {
    return [];
  }
  if (n === 3) {
    return [0, 1, 2];
  }

  const indices: number[] = [];
  const remaining = points.map((_, i) => i);

  // Ensure polygon is counter-clockwise
  if (polygonArea(points) < 0) {
    remaining.reverse();
  }

  let safety = n * 2;
  while (remaining.length > 3 && safety > 0) {
    safety--;
    let earFound = false;

    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i - 1 + remaining.length) % remaining.length]!;
      const curr = remaining[i]!;
      const next = remaining[(i + 1) % remaining.length]!;

      if (isEar(points, remaining, prev, curr, next)) {
        indices.push(prev, curr, next);
        remaining.splice(i, 1);
        earFound = true;
        break;
      }
    }

    if (!earFound) {
      // Fallback: just add a triangle anyway to prevent infinite loop
      if (remaining.length >= 3) {
        indices.push(remaining[0]!, remaining[1]!, remaining[2]!);
        remaining.splice(1, 1);
      }
    }
  }

  if (remaining.length === 3) {
    indices.push(remaining[0]!, remaining[1]!, remaining[2]!);
  }

  return indices;
}

/**
 * Calculate signed area of polygon.
 */
function polygonArea(points: Array<{ x: number; y: number }>): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % points.length]!;
    area += (p2.x - p1.x) * (p2.y + p1.y);
  }
  return area / 2;
}

/**
 * Check if vertex at index curr is an ear.
 */
function isEar(
  points: Array<{ x: number; y: number }>,
  remaining: number[],
  prev: number,
  curr: number,
  next: number
): boolean {
  const a = points[prev]!;
  const b = points[curr]!;
  const c = points[next]!;

  // Check if triangle is convex
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (cross <= 0) {
    return false;
  }

  // Check if any other vertex is inside the triangle
  for (const idx of remaining) {
    if (idx === prev || idx === curr || idx === next) {
      continue;
    }
    if (pointInTriangle(points[idx]!, a, b, c)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if point p is inside triangle abc.
 */
function pointInTriangle(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): boolean {
  const v0x = c.x - a.x;
  const v0y = c.y - a.y;
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = p.x - a.x;
  const v2y = p.y - a.y;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return u >= 0 && v >= 0 && u + v < 1;
}

/**
 * Factory function to create a new path builder.
 */
export function path(): PathBuilder {
  return new PathBuilder();
}

/**
 * WGSL shader for path rendering with antialiasing. Uses edge distance
 * interpolation for smooth AA at triangle edges. Edge distance
 * of 0.0 = on edge (semi-transparent), 1.0 = interior (opaque).
 */
const PATH_SHADER = /* wgsl */ `
struct Uniforms {
  viewport_size: vec2<f32>,
  scale: f32,
  _padding: f32,
}

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
  @location(2) clip_bounds: vec4<f32>,
  @location(3) clip_params: vec4<f32>,
  @location(4) transform_ab: vec4<f32>,
  @location(5) transform_cd: vec4<f32>,
  @location(6) edge_dist: f32,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
  @location(1) clip_bounds: vec4<f32>,
  @location(2) clip_corner_radius: f32,
  @location(3) has_clip: f32,
  @location(4) edge_dist: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

fn apply_transform(pos: vec2<f32>, transform_ab: vec4<f32>, transform_cd: vec4<f32>) -> vec2<f32> {
  let a = transform_ab.x;
  let b = transform_ab.y;
  let tx = transform_ab.z;
  let c = transform_cd.x;
  let d = transform_cd.y;
  let ty = transform_cd.z;
  return vec2<f32>(
    a * pos.x + b * pos.y + tx,
    c * pos.x + d * pos.y + ty
  );
}

@vertex
fn vs_main(in: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  var world_pos = in.position;
  let has_transform = in.transform_ab.w > 0.5;

  if has_transform {
    world_pos = apply_transform(world_pos, in.transform_ab, in.transform_cd);
  }

  let scaled_pos = world_pos * uniforms.scale;

  let clip_pos = vec2<f32>(
    (scaled_pos.x / uniforms.viewport_size.x) * 2.0 - 1.0,
    1.0 - (scaled_pos.y / uniforms.viewport_size.y) * 2.0
  );

  out.position = vec4<f32>(clip_pos, 0.5, 1.0);
  out.color = in.color;
  out.clip_bounds = vec4<f32>(
    in.clip_bounds.x * uniforms.scale,
    in.clip_bounds.y * uniforms.scale,
    in.clip_bounds.z * uniforms.scale,
    in.clip_bounds.w * uniforms.scale
  );
  out.clip_corner_radius = in.clip_params.x * uniforms.scale;
  out.has_clip = in.clip_params.y;
  out.edge_dist = in.edge_dist;

  return out;
}

fn quad_sdf(p: vec2<f32>, half_size: vec2<f32>, corner_radius: f32) -> f32 {
  let corner_to_point = abs(p) - half_size;
  let q = corner_to_point + vec2<f32>(corner_radius, corner_radius);
  if corner_radius == 0.0 {
    return max(corner_to_point.x, corner_to_point.y);
  }
  return length(max(q, vec2<f32>(0.0, 0.0))) + min(max(q.x, q.y), 0.0) - corner_radius;
}

fn clip_sdf(pos: vec2<f32>, clip_bounds: vec4<f32>, corner_radius: f32) -> f32 {
  let clip_origin = clip_bounds.xy;
  let clip_size = clip_bounds.zw;
  let clip_half_size = clip_size * 0.5;
  let clip_center = clip_origin + clip_half_size;
  let local_pos = pos - clip_center;
  return quad_sdf(local_pos, clip_half_size, corner_radius);
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  if in.has_clip > 0.5 {
    let frag_pos = in.position.xy;
    let clip_dist = clip_sdf(frag_pos, in.clip_bounds, in.clip_corner_radius);
    if clip_dist > 0.0 {
      discard;
    }
  }

  // Antialiasing: smooth the edge based on edge distance and screen-space gradient
  let edge_width = fwidth(in.edge_dist);
  let aa_alpha = smoothstep(0.0, edge_width * 1.5, in.edge_dist);

  // Apply AA to the premultiplied color
  return vec4<f32>(in.color.rgb * aa_alpha, in.color.a * aa_alpha);
}
`;

/**
 * Vertex data layout for paths: 24 floats per vertex.
 * - position: 2 floats (x, y)
 * - color: 4 floats (r, g, b, a) - premultiplied
 * - clip_bounds: 4 floats (x, y, width, height)
 * - clip_params: 4 floats (corner_radius, has_clip, 0, 0)
 * - transform_ab: 4 floats (a, b, tx, has_transform)
 * - transform_cd: 4 floats (c, d, ty, 0)
 * - edge_dist: 1 float (0.0 = edge, 1.0 = interior) + 1 padding
 */
const FLOATS_PER_VERTEX = 24;
const BYTES_PER_VERTEX = FLOATS_PER_VERTEX * 4;

/**
 * Path rendering pipeline. Supports interleaved batch rendering where
 * renderBatch() can be called multiple times per frame. Call beginFrame()
 * at the start of each frame to reset the buffer offsets.
 */
export class PathPipeline {
  private pipeline: GPURenderPipeline;
  private vertexBuffer: GPUBuffer;
  private indexBuffer: GPUBuffer;
  private vertexData: Float32Array;
  private indexData: Uint32Array;
  private maxVertices: number;
  private maxIndices: number;

  /** Current offsets for interleaved rendering. */
  private currentVertexOffset = 0;
  private currentIndexOffset = 0;
  private currentBaseVertex = 0;

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
    uniformBindGroupLayout: GPUBindGroupLayout,
    maxVertices: number = 100000,
    maxIndices: number = 300000,
    sampleCount: number = 1
  ) {
    this.maxVertices = maxVertices;
    this.maxIndices = maxIndices;
    this.vertexData = new Float32Array(maxVertices * FLOATS_PER_VERTEX);
    this.indexData = new Uint32Array(maxIndices);

    this.vertexBuffer = device.createBuffer({
      size: this.vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.indexBuffer = device.createBuffer({
      size: this.indexData.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    const shaderModule = device.createShaderModule({
      code: PATH_SHADER,
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [uniformBindGroupLayout],
    });

    this.pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: BYTES_PER_VERTEX,
            stepMode: "vertex",
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x2" }, // position
              { shaderLocation: 1, offset: 8, format: "float32x4" }, // color
              { shaderLocation: 2, offset: 24, format: "float32x4" }, // clip_bounds
              { shaderLocation: 3, offset: 40, format: "float32x4" }, // clip_params
              { shaderLocation: 4, offset: 56, format: "float32x4" }, // transform_ab
              { shaderLocation: 5, offset: 72, format: "float32x4" }, // transform_cd
              { shaderLocation: 6, offset: 88, format: "float32" }, // edge_dist
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format,
            blend: PREMULTIPLIED_ALPHA_BLEND,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
      multisample: {
        count: sampleCount,
      },
    });
  }

  /**
   * Reset the buffer offsets for a new frame. Must be called before the
   * first renderBatch() call each frame.
   */
  beginFrame(): void {
    this.currentVertexOffset = 0;
    this.currentIndexOffset = 0;
    this.currentBaseVertex = 0;
  }

  /**
   * Render a batch of paths at the current buffer offset. Can be called
   * multiple times per frame for interleaved rendering.
   */
  renderBatch(
    pass: GPURenderPassEncoder,
    paths: PathPrimitive[],
    uniformBindGroup: GPUBindGroup
  ): void {
    if (paths.length === 0) {
      return;
    }

    const startVertexOffset = this.currentVertexOffset;
    const startIndexOffset = this.currentIndexOffset;
    let vertexCount = 0;
    let indexCount = 0;

    for (const path of paths) {
      if (path.vertices.length === 0 || path.indices.length === 0) {
        continue;
      }

      const numVertices = path.vertices.length;
      const numIndices = path.indices.length;

      if (this.currentVertexOffset + numVertices > this.maxVertices) {
        log.warn(
          `PathPipeline: vertex buffer full (${this.currentVertexOffset}/${this.maxVertices})`
        );
        break;
      }
      if (this.currentIndexOffset + numIndices > this.maxIndices) {
        log.warn(`PathPipeline: index buffer full (${this.currentIndexOffset}/${this.maxIndices})`);
        break;
      }

      // Premultiply alpha
      const a = path.color.a;
      const pr = path.color.r * a;
      const pg = path.color.g * a;
      const pb = path.color.b * a;

      const clip = path.clipBounds;
      const transform = path.transform;

      for (let i = 0; i < numVertices; i++) {
        const v = path.vertices[i]!;
        const offset = (this.currentVertexOffset + i) * FLOATS_PER_VERTEX;

        // position
        this.vertexData[offset + 0] = v.x;
        this.vertexData[offset + 1] = v.y;

        // color (premultiplied)
        this.vertexData[offset + 2] = pr;
        this.vertexData[offset + 3] = pg;
        this.vertexData[offset + 4] = pb;
        this.vertexData[offset + 5] = a;

        // clip_bounds
        this.vertexData[offset + 6] = clip?.x ?? 0;
        this.vertexData[offset + 7] = clip?.y ?? 0;
        this.vertexData[offset + 8] = clip?.width ?? 0;
        this.vertexData[offset + 9] = clip?.height ?? 0;

        // clip_params
        this.vertexData[offset + 10] = clip?.cornerRadius ?? 0;
        this.vertexData[offset + 11] = clip ? 1.0 : 0.0;
        this.vertexData[offset + 12] = 0;
        this.vertexData[offset + 13] = 0;

        // transform_ab
        this.vertexData[offset + 14] = transform?.a ?? 1;
        this.vertexData[offset + 15] = transform?.b ?? 0;
        this.vertexData[offset + 16] = transform?.tx ?? 0;
        this.vertexData[offset + 17] = transform ? 1.0 : 0.0;

        // transform_cd
        this.vertexData[offset + 18] = transform?.c ?? 0;
        this.vertexData[offset + 19] = transform?.d ?? 1;
        this.vertexData[offset + 20] = transform?.ty ?? 0;
        this.vertexData[offset + 21] = 0;

        // edge_dist (defaults to 1.0 for interior if not specified)
        this.vertexData[offset + 22] = v.edgeDist ?? 1.0;
        this.vertexData[offset + 23] = 0; // padding
      }

      for (let i = 0; i < numIndices; i++) {
        this.indexData[this.currentIndexOffset + i] = this.currentBaseVertex + path.indices[i]!;
      }

      this.currentVertexOffset += numVertices;
      this.currentIndexOffset += numIndices;
      this.currentBaseVertex += numVertices;
      vertexCount += numVertices;
      indexCount += numIndices;
    }

    if (indexCount === 0) {
      return;
    }

    // Upload at offset
    this.device.queue.writeBuffer(
      this.vertexBuffer,
      startVertexOffset * BYTES_PER_VERTEX,
      this.vertexData,
      startVertexOffset * FLOATS_PER_VERTEX,
      vertexCount * FLOATS_PER_VERTEX
    );
    this.device.queue.writeBuffer(
      this.indexBuffer,
      startIndexOffset * 4, // Uint32 = 4 bytes
      this.indexData,
      startIndexOffset,
      indexCount
    );

    // Draw this batch
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, uniformBindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.setIndexBuffer(this.indexBuffer, "uint32");
    pass.drawIndexed(indexCount, 1, startIndexOffset);
  }

  /**
   * Destroy the pipeline and release resources.
   */
  destroy(): void {
    this.vertexBuffer.destroy();
    this.indexBuffer.destroy();
  }
}
