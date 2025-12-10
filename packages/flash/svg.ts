/**
 * SVG rendering for Flash.
 *
 * Provides SVG parsing and rendering via path tessellation.
 * Parses SVG path `d` attributes and converts them to PathBuilder commands.
 *
 * For MVP, we focus on path-based rendering:
 * - Parse SVG XML to extract path elements
 * - Parse path `d` attribute commands
 * - Render using existing PathPipeline with color tinting
 */

import type { Color, Bounds, TransformationMatrix } from "./types.ts";
import type {
  RequestLayoutContext,
  PrepaintContext,
  PaintContext,
  RequestLayoutResult,
} from "./element.ts";
import { FlashElement } from "./element.ts";
import type { HitTestNode } from "./dispatch.ts";
import { PathBuilder } from "./path.ts";

/**
 * Parsed SVG path command.
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
 * A parsed SVG path element.
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
 * Parse an SVG path `d` attribute string into commands.
 */
export function parseSvgPathD(d: string): SvgPathCommand[] {
  const commands: SvgPathCommand[] = [];
  const tokens = tokenizeSvgPath(d);
  if (tokens.length === 0) return commands;

  let i = 0;
  let currentCmd = "M";

  const parseNumber = (): number => {
    if (i >= tokens.length) return 0;
    const val = parseFloat(tokens[i]!);
    if (isNaN(val)) return 0;
    i++;
    return val;
  };

  const parseFlag = (): boolean => {
    if (i >= tokens.length) return false;
    const val = tokens[i]!;
    i++;
    return val === "1";
  };

  const isCommand = (token: string): boolean => /^[MmLlHhVvCcSsQqTtAaZz]$/.test(token);

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (isCommand(token)) {
      currentCmd = token;
      i++;
      if (i >= tokens.length && currentCmd.toUpperCase() !== "Z") {
        break;
      }
    }

    const relative = currentCmd === currentCmd.toLowerCase();
    const cmd = currentCmd.toUpperCase();

    switch (cmd) {
      case "M":
        commands.push({ type: "M", x: parseNumber(), y: parseNumber(), relative });
        currentCmd = relative ? "l" : "L";
        break;
      case "L":
        commands.push({ type: "L", x: parseNumber(), y: parseNumber(), relative });
        break;
      case "H":
        commands.push({ type: "H", x: parseNumber(), relative });
        break;
      case "V":
        commands.push({ type: "V", y: parseNumber(), relative });
        break;
      case "C":
        commands.push({
          type: "C",
          x1: parseNumber(),
          y1: parseNumber(),
          x2: parseNumber(),
          y2: parseNumber(),
          x: parseNumber(),
          y: parseNumber(),
          relative,
        });
        break;
      case "S":
        commands.push({
          type: "S",
          x2: parseNumber(),
          y2: parseNumber(),
          x: parseNumber(),
          y: parseNumber(),
          relative,
        });
        break;
      case "Q":
        commands.push({
          type: "Q",
          x1: parseNumber(),
          y1: parseNumber(),
          x: parseNumber(),
          y: parseNumber(),
          relative,
        });
        break;
      case "T":
        commands.push({ type: "T", x: parseNumber(), y: parseNumber(), relative });
        break;
      case "A":
        commands.push({
          type: "A",
          rx: parseNumber(),
          ry: parseNumber(),
          rotation: parseNumber(),
          largeArc: parseFlag(),
          sweep: parseFlag(),
          x: parseNumber(),
          y: parseNumber(),
          relative,
        });
        break;
      case "Z":
        commands.push({ type: "Z" });
        break;
      default:
        i++;
        break;
    }
  }

  return commands;
}

/**
 * Tokenize an SVG path `d` attribute string.
 */
function tokenizeSvgPath(d: string): string[] {
  const tokens: string[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)/g;
  let match;
  while ((match = regex.exec(d)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

/**
 * Convert SVG path commands to PathBuilder commands.
 * Handles relative coordinates and implicit commands.
 */
export function svgCommandsToPathBuilder(
  commands: SvgPathCommand[],
  pathBuilder: PathBuilder,
  offsetX = 0,
  offsetY = 0,
  scaleX = 1,
  scaleY = 1
): void {
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCmd = "";

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M": {
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.moveTo(x, y);
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        startX = currentX;
        startY = currentY;
        break;
      }
      case "L": {
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.lineTo(x, y);
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        break;
      }
      case "H": {
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = currentY * scaleY + offsetY;
        pathBuilder.lineTo(x, y);
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        break;
      }
      case "V": {
        const x = currentX * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.lineTo(x, y);
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        break;
      }
      case "C": {
        const x1 = (cmd.relative ? currentX + cmd.x1 : cmd.x1) * scaleX + offsetX;
        const y1 = (cmd.relative ? currentY + cmd.y1 : cmd.y1) * scaleY + offsetY;
        const x2 = (cmd.relative ? currentX + cmd.x2 : cmd.x2) * scaleX + offsetX;
        const y2 = (cmd.relative ? currentY + cmd.y2 : cmd.y2) * scaleY + offsetY;
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.cubicTo(x1, y1, x2, y2, x, y);
        lastControlX = cmd.relative ? currentX + cmd.x2 : cmd.x2;
        lastControlY = cmd.relative ? currentY + cmd.y2 : cmd.y2;
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        break;
      }
      case "S": {
        let cx1: number, cy1: number;
        if (lastCmd === "C" || lastCmd === "S") {
          cx1 = 2 * currentX - lastControlX;
          cy1 = 2 * currentY - lastControlY;
        } else {
          cx1 = currentX;
          cy1 = currentY;
        }
        const x2 = (cmd.relative ? currentX + cmd.x2 : cmd.x2) * scaleX + offsetX;
        const y2 = (cmd.relative ? currentY + cmd.y2 : cmd.y2) * scaleY + offsetY;
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.cubicTo(cx1 * scaleX + offsetX, cy1 * scaleY + offsetY, x2, y2, x, y);
        lastControlX = cmd.relative ? currentX + cmd.x2 : cmd.x2;
        lastControlY = cmd.relative ? currentY + cmd.y2 : cmd.y2;
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        break;
      }
      case "Q": {
        const cx = (cmd.relative ? currentX + cmd.x1 : cmd.x1) * scaleX + offsetX;
        const cy = (cmd.relative ? currentY + cmd.y1 : cmd.y1) * scaleY + offsetY;
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.quadTo(cx, cy, x, y);
        lastControlX = cmd.relative ? currentX + cmd.x1 : cmd.x1;
        lastControlY = cmd.relative ? currentY + cmd.y1 : cmd.y1;
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        break;
      }
      case "T": {
        let cx: number, cy: number;
        if (lastCmd === "Q" || lastCmd === "T") {
          cx = 2 * currentX - lastControlX;
          cy = 2 * currentY - lastControlY;
        } else {
          cx = currentX;
          cy = currentY;
        }
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.quadTo(cx * scaleX + offsetX, cy * scaleY + offsetY, x, y);
        lastControlX = cx;
        lastControlY = cy;
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        break;
      }
      case "A": {
        const x = (cmd.relative ? currentX + cmd.x : cmd.x) * scaleX + offsetX;
        const y = (cmd.relative ? currentY + cmd.y : cmd.y) * scaleY + offsetY;
        pathBuilder.arcTo(
          cmd.rx * scaleX,
          cmd.ry * scaleY,
          cmd.rotation,
          cmd.largeArc,
          cmd.sweep,
          x,
          y
        );
        currentX = cmd.relative ? currentX + cmd.x : cmd.x;
        currentY = cmd.relative ? currentY + cmd.y : cmd.y;
        break;
      }
      case "Z":
        pathBuilder.close();
        currentX = startX;
        currentY = startY;
        break;
    }
    lastCmd = cmd.type;
  }
}

/**
 * Parse a simple SVG XML string.
 * Extracts viewBox, dimensions, and path elements.
 * This is a minimal parser - not a full XML parser.
 */
export function parseSvg(svgContent: string): ParsedSvg {
  const result: ParsedSvg = {
    width: 24,
    height: 24,
    viewBox: null,
    paths: [],
  };

  const widthMatch = svgContent.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)/i);
  if (widthMatch) {
    result.width = parseFloat(widthMatch[1]!);
  }

  const heightMatch = svgContent.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)/i);
  if (heightMatch) {
    result.height = parseFloat(heightMatch[1]!);
  }

  const viewBoxMatch = svgContent.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1]!
      .trim()
      .split(/[\s,]+/)
      .map(parseFloat);
    if (parts.length === 4) {
      result.viewBox = {
        x: parts[0]!,
        y: parts[1]!,
        width: parts[2]!,
        height: parts[3]!,
      };
    }
  }

  const pathRegex = /<path\b([^>]*)\/?>|<path\b([^>]*)>([^<]*)<\/path>/gi;
  let pathMatch;
  while ((pathMatch = pathRegex.exec(svgContent)) !== null) {
    const attrs = pathMatch[1] || pathMatch[2] || "";
    const dMatch = attrs.match(/\bd\s*=\s*["']([^"']+)["']/);
    if (dMatch) {
      const path: ParsedSvgPath = {
        commands: parseSvgPathD(dMatch[1]!),
      };

      const fillMatch = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/);
      if (fillMatch) {
        path.fill = fillMatch[1];
      }

      const strokeMatch = attrs.match(/\bstroke\s*=\s*["']([^"']+)["']/);
      if (strokeMatch) {
        path.stroke = strokeMatch[1];
      }

      const strokeWidthMatch = attrs.match(/\bstroke-width\s*=\s*["']?(\d+(?:\.\d+)?)/);
      if (strokeWidthMatch) {
        path.strokeWidth = parseFloat(strokeWidthMatch[1]!);
      }

      result.paths.push(path);
    }
  }

  const circleRegex = /<circle\b([^>]*)\/?>|<circle\b([^>]*)>([^<]*)<\/circle>/gi;
  let circleMatch;
  while ((circleMatch = circleRegex.exec(svgContent)) !== null) {
    const attrs = circleMatch[1] || circleMatch[2] || "";
    const cxMatch = attrs.match(/\bcx\s*=\s*["']?(\d+(?:\.\d+)?)/);
    const cyMatch = attrs.match(/\bcy\s*=\s*["']?(\d+(?:\.\d+)?)/);
    const rMatch = attrs.match(/\br\s*=\s*["']?(\d+(?:\.\d+)?)/);
    if (cxMatch && cyMatch && rMatch) {
      const cx = parseFloat(cxMatch[1]!);
      const cy = parseFloat(cyMatch[1]!);
      const r = parseFloat(rMatch[1]!);
      const k = 0.5522847498;
      const d = `M${cx + r},${cy} C${cx + r},${cy + k * r} ${cx + k * r},${cy + r} ${cx},${cy + r} C${cx - k * r},${cy + r} ${cx - r},${cy + k * r} ${cx - r},${cy} C${cx - r},${cy - k * r} ${cx - k * r},${cy - r} ${cx},${cy - r} C${cx + k * r},${cy - r} ${cx + r},${cy - k * r} ${cx + r},${cy} Z`;
      const path: ParsedSvgPath = {
        commands: parseSvgPathD(d),
      };
      const fillMatch = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/);
      if (fillMatch) path.fill = fillMatch[1];
      result.paths.push(path);
    }
  }

  const rectRegex = /<rect\b([^>]*)\/?>|<rect\b([^>]*)>([^<]*)<\/rect>/gi;
  let rectMatch;
  while ((rectMatch = rectRegex.exec(svgContent)) !== null) {
    const attrs = rectMatch[1] || rectMatch[2] || "";
    const xMatch = attrs.match(/\bx\s*=\s*["']?(\d+(?:\.\d+)?)/);
    const yMatch = attrs.match(/\by\s*=\s*["']?(\d+(?:\.\d+)?)/);
    const wMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)/);
    const hMatch = attrs.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)/);
    if (wMatch && hMatch) {
      const x = xMatch ? parseFloat(xMatch[1]!) : 0;
      const y = yMatch ? parseFloat(yMatch[1]!) : 0;
      const w = parseFloat(wMatch[1]!);
      const h = parseFloat(hMatch[1]!);
      const d = `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
      const path: ParsedSvgPath = {
        commands: parseSvgPathD(d),
      };
      const fillMatch = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/);
      if (fillMatch) path.fill = fillMatch[1];
      result.paths.push(path);
    }
  }

  const polygonRegex = /<polygon\b([^>]*)\/?>|<polygon\b([^>]*)>([^<]*)<\/polygon>/gi;
  let polygonMatch;
  while ((polygonMatch = polygonRegex.exec(svgContent)) !== null) {
    const attrs = polygonMatch[1] || polygonMatch[2] || "";
    const pointsMatch = attrs.match(/\bpoints\s*=\s*["']([^"']+)["']/);
    if (pointsMatch) {
      const points = pointsMatch[1]!
        .trim()
        .split(/[\s,]+/)
        .map(parseFloat);
      if (points.length >= 4) {
        let d = `M${points[0]},${points[1]}`;
        for (let i = 2; i < points.length; i += 2) {
          d += ` L${points[i]},${points[i + 1]}`;
        }
        d += " Z";
        const path: ParsedSvgPath = {
          commands: parseSvgPathD(d),
        };
        const fillMatch = attrs.match(/\bfill\s*=\s*["']([^"']+)["']/);
        if (fillMatch) path.fill = fillMatch[1];
        result.paths.push(path);
      }
    }
  }

  if (result.viewBox) {
    result.width = result.viewBox.width;
    result.height = result.viewBox.height;
  }

  return result;
}

/**
 * Cached tessellated path data for a single SVG path.
 */
interface CachedPathData {
  vertices: Array<{ x: number; y: number }>;
  indices: number[];
  bounds: { x: number; y: number; width: number; height: number };
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
}

/**
 * SVG element for rendering SVG content with color tinting.
 *
 * Usage:
 * ```ts
 * svg(svgContent).color({ r: 1, g: 0, b: 0, a: 1 }).size(24, 24)
 * ```
 */
export class SvgElement extends FlashElement<SvgRequestState, SvgPrepaintState> {
  private tintColor: Color = { r: 1, g: 1, b: 1, a: 1 };
  private displayWidth?: number;
  private displayHeight?: number;
  private parsedSvg: ParsedSvg;

  constructor(svgContent: string) {
    super();
    this.parsedSvg = parseSvg(svgContent);
  }

  color(c: Color): this {
    this.tintColor = c;
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
    const nativeWidth = this.parsedSvg.viewBox?.width ?? this.parsedSvg.width;
    const nativeHeight = this.parsedSvg.viewBox?.height ?? this.parsedSvg.height;
    const displayWidth = this.displayWidth ?? nativeWidth;
    const displayHeight = this.displayHeight ?? nativeHeight;

    const scaleX = displayWidth / nativeWidth;
    const scaleY = displayHeight / nativeHeight;

    const cachedPaths: CachedPathData[] = [];

    for (const path of this.parsedSvg.paths) {
      if (path.fill !== "none") {
        const pathBuilder = new PathBuilder();
        svgCommandsToPathBuilder(path.commands, pathBuilder, 0, 0, scaleX, scaleY);
        const tessellated = pathBuilder.tessellate();
        cachedPaths.push({
          vertices: tessellated.vertices,
          indices: tessellated.indices,
          bounds: tessellated.bounds,
        });
      }
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
      requestState: { cachedPaths, nativeWidth, nativeHeight },
    };
  }

  prepaint(_cx: PrepaintContext, _bounds: Bounds, requestState: SvgRequestState): SvgPrepaintState {
    return { cachedPaths: requestState.cachedPaths };
  }

  paint(cx: PaintContext, bounds: Bounds, prepaintState: SvgPrepaintState): void {
    for (const cached of prepaintState.cachedPaths) {
      const offsetVertices = cached.vertices.map((v) => ({
        x: v.x + bounds.x,
        y: v.y + bounds.y,
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
        this.tintColor
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
