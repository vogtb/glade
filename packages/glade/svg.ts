/**
 * SVG rendering for Glade.
 *
 * Uses WASM-based tessellation via Lyon for high-quality path rendering.
 * Parses SVG content and renders via the PathPipeline with color tinting.
 *
 * Features:
 * - Global mesh caching to avoid re-tessellation
 * - High-quality tessellation with fine tolerance
 */

import { type Bounds, type TransformationMatrix } from "./types.ts";
import type {
  RequestLayoutContext,
  PrepaintContext,
  PaintContext,
  RequestLayoutResult,
} from "./element.ts";
import { GladeElement } from "./element.ts";
import type { HitTestNode } from "./dispatch.ts";
import {
  createSvgTessellator,
  tessellateSvg,
  parseSvg as parseSvgWasm,
  type TessellatedMesh,
  type ParsedSvg as WasmParsedSvg,
  type SvgTessellator,
} from "@glade/svg";
import { toColorObject, type Color, type ColorObject } from "@glade/utils";

export type { TessellatedMesh } from "@glade/svg";

let sharedTessellator: SvgTessellator | null = null;

function getTessellator(): SvgTessellator {
  if (!sharedTessellator) {
    sharedTessellator = createSvgTessellator();
  }
  return sharedTessellator;
}

/**
 * Parsed SVG path command (legacy - kept for backwards compatibility).
 */
export type SvgPathCommand =
  | { type: "M"; x: number; y: number; relative: boolean }
  | { type: "L"; x: number; y: number; relative: boolean }
  | { type: "H"; x: number; relative: boolean }
  | { type: "V"; y: number; relative: boolean }
  | {
      type: "C";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x: number;
      y: number;
      relative: boolean;
    }
  | { type: "S"; x2: number; y2: number; x: number; y: number; relative: boolean }
  | { type: "Q"; x1: number; y1: number; x: number; y: number; relative: boolean }
  | { type: "T"; x: number; y: number; relative: boolean }
  | {
      type: "A";
      rx: number;
      ry: number;
      rotation: number;
      largeArc: boolean;
      sweep: boolean;
      x: number;
      y: number;
      relative: boolean;
    }
  | { type: "Z" };

/**
 * A parsed SVG path element (legacy interface for compatibility).
 */
export interface ParsedSvgPath {
  commands: SvgPathCommand[];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

/**
 * A parsed SVG document.
 */
export interface ParsedSvg {
  width: number;
  height: number;
  viewBox: { x: number; y: number; width: number; height: number } | null;
  paths: ParsedSvgPath[];
}

/**
 * Parse a simple SVG XML string using the WASM parser.
 * Returns data compatible with the legacy ParsedSvg interface.
 */
export function parseSvg(svgContent: string): ParsedSvg {
  const wasmParsed: WasmParsedSvg = parseSvgWasm(getTessellator(), svgContent);
  return {
    width: wasmParsed.width,
    height: wasmParsed.height,
    viewBox: wasmParsed.view_box
      ? {
          x: wasmParsed.view_box.x,
          y: wasmParsed.view_box.y,
          width: wasmParsed.view_box.width,
          height: wasmParsed.view_box.height,
        }
      : null,
    paths: wasmParsed.paths.map((p) => ({
      commands: [],
      fill: p.fill,
      stroke: p.stroke,
      strokeWidth: p.stroke_width,
    })),
  };
}

/**
 * Cached tessellated path data for a single SVG path.
 */
interface CachedPathData {
  vertices: Array<{ x: number; y: number; edgeDist: number }>;
  indices: number[];
  bounds: { x: number; y: number; width: number; height: number };
}

/**
 * Global SVG mesh cache.
 * Keyed by SVG content hash + display size for efficient reuse.
 */
class SvgMeshCache {
  private cache = new Map<string, CachedPathData[]>();
  private maxEntries = 500;
  private accessOrder: string[] = [];

  private makeKey(content: string, width: number, height: number): string {
    return `${this.hashContent(content)}:${width.toFixed(1)}x${height.toFixed(1)}`;
  }

  private hashContent(content: string): number {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return hash;
  }

  get(content: string, width: number, height: number): CachedPathData[] | undefined {
    const key = this.makeKey(content, width, height);
    const cached = this.cache.get(key);
    if (cached) {
      const idx = this.accessOrder.indexOf(key);
      if (idx > -1) {
        this.accessOrder.splice(idx, 1);
        this.accessOrder.push(key);
      }
    }
    return cached;
  }

  set(content: string, width: number, height: number, paths: CachedPathData[]): void {
    const key = this.makeKey(content, width, height);

    if (this.cache.size >= this.maxEntries) {
      const oldest = this.accessOrder.shift();
      if (oldest) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, paths);
    this.accessOrder.push(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

const globalSvgCache = new SvgMeshCache();

/**
 * Clear the global SVG mesh cache.
 * Call this if you need to free memory.
 */
export function clearSvgCache(): void {
  globalSvgCache.clear();
}

/**
 * SVG element state for layout.
 */
interface SvgRequestState {
  cachedPaths: CachedPathData[];
  nativeWidth: number;
  nativeHeight: number;
}

/**
 * SVG element prepaint state - carries cached paths to paint phase.
 */
interface SvgPrepaintState {
  cachedPaths: CachedPathData[];
  tintColor: ColorObject;
}

/**
 * Convert WASM mesh to cached path data format.
 * Vertices now include edge distance for antialiasing (3 floats per vertex: x, y, edgeDist).
 */
function meshToCachedPath(mesh: TessellatedMesh): CachedPathData {
  const vertices: Array<{ x: number; y: number; edgeDist: number }> = [];
  // Vertex format: [x, y, edgeDist, x, y, edgeDist, ...]
  for (let i = 0; i < mesh.vertices.length; i += 3) {
    vertices.push({
      x: mesh.vertices[i]!,
      y: mesh.vertices[i + 1]!,
      edgeDist: mesh.vertices[i + 2]!,
    });
  }
  return {
    vertices,
    indices: Array.from(mesh.indices),
    bounds: {
      x: mesh.bounds.min_x,
      y: mesh.bounds.min_y,
      width: mesh.bounds.max_x - mesh.bounds.min_x,
      height: mesh.bounds.max_y - mesh.bounds.min_y,
    },
  };
}

/**
 * SVG element for rendering SVG content with color tinting.
 *
 * Usage:
 * ```ts
 * svg(svgContent).color({ r: 1, g: 0, b: 0, a: 1 }).size(24, 24)
 * ```
 */
export class SvgElement extends GladeElement<SvgRequestState, SvgPrepaintState> {
  private tintColor: ColorObject = { r: 1, g: 1, b: 1, a: 1 };
  private hasCustomTint = false;
  private displayWidth?: number;
  private displayHeight?: number;
  private svgContent: string;
  private cachedNativeSize: { width: number; height: number } | null = null;

  constructor(svgContent: string) {
    super();
    this.svgContent = svgContent;
  }

  private getNativeSize(): { width: number; height: number } {
    if (!this.cachedNativeSize) {
      const parsed = parseSvgWasm(getTessellator(), this.svgContent);
      this.cachedNativeSize = {
        width: parsed.view_box?.width ?? parsed.width,
        height: parsed.view_box?.height ?? parsed.height,
      };
    }
    return this.cachedNativeSize;
  }

  color(c: Color): this {
    this.tintColor = toColorObject(c);
    this.hasCustomTint = true;
    return this;
  }

  width(w: number): this {
    this.displayWidth = w;
    return this;
  }

  height(h: number): this {
    this.displayHeight = h;
    return this;
  }

  size(w: number, h: number): this {
    this.displayWidth = w;
    this.displayHeight = h;
    return this;
  }

  transform(_t: TransformationMatrix): this {
    return this;
  }

  requestLayout(cx: RequestLayoutContext): RequestLayoutResult<SvgRequestState> {
    const nativeSize = this.getNativeSize();
    const displayWidth = this.displayWidth ?? nativeSize.width;
    const displayHeight = this.displayHeight ?? nativeSize.height;

    let cachedPaths = globalSvgCache.get(this.svgContent, displayWidth, displayHeight);

    if (!cachedPaths) {
      const meshes = tessellateSvg(getTessellator(), this.svgContent, displayWidth, displayHeight);
      cachedPaths = meshes.map(meshToCachedPath);
      globalSvgCache.set(this.svgContent, displayWidth, displayHeight, cachedPaths);
    }

    const layoutId = cx.requestLayout(
      {
        width: displayWidth,
        height: displayHeight,
      },
      []
    );

    return {
      layoutId,
      requestState: { cachedPaths, nativeWidth: nativeSize.width, nativeHeight: nativeSize.height },
    };
  }

  prepaint(cx: PrepaintContext, _bounds: Bounds, requestState: SvgRequestState): SvgPrepaintState {
    const theme = cx.getWindow().getTheme();
    const tintColor = this.hasCustomTint ? this.tintColor : theme.components.icon.foreground;
    return { cachedPaths: requestState.cachedPaths, tintColor };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: SvgPrepaintState): void {
    for (const cached of prepaintState.cachedPaths) {
      const offsetVertices = cached.vertices.map((v) => ({
        x: v.x + bounds.x,
        y: v.y + bounds.y,
        edgeDist: v.edgeDist,
      }));

      cx.paintCachedPath(
        offsetVertices,
        cached.indices,
        {
          x: cached.bounds.x + bounds.x,
          y: cached.bounds.y + bounds.y,
          width: cached.bounds.width,
          height: cached.bounds.height,
        },
        prepaintState.tintColor
      );
    }
  }

  hitTest(_bounds: Bounds, _childBounds: Bounds[]): HitTestNode | null {
    return null;
  }
}

/**
 * Factory function to create an SVG element.
 *
 * @param content - SVG content string (full SVG XML or just path d attribute)
 */
export function svg(content: string): SvgElement {
  if (content.startsWith("<")) {
    return new SvgElement(content);
  }
  const wrappedSvg = `<svg viewBox="0 0 24 24"><path d="${content}"/></svg>`;
  return new SvgElement(wrappedSvg);
}

/**
 * Common SVG icon paths for convenience.
 * These are Material Design-style icons in 24x24 viewBox.
 */
export const SvgIcons = {
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  close:
    "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  arrowRight: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
  arrowLeft: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
  arrowUp: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
  arrowDown: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
  plus: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  minus: "M19 13H5v-2h14v2z",
  search:
    "M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
  settings:
    "M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  home: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  starOutline:
    "M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z",
  heart:
    "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  trash: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  copy: "M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z",
  folder:
    "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
  file: "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
  refresh:
    "M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
  upload: "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
  info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  error:
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
} as const;
