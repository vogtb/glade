/**
 * Text rendering system for Flash.
 *
 * Provides text shaping, glyph atlas management, and GPU text rendering.
 * Inspired by Zed's GPUI text system architecture.
 *
 * COORDINATE SPACES
 * =================
 *
 * This module uses three coordinate spaces:
 *
 * 1. TEXT-LOCAL SPACE
 *    Origin: (0, 0) at top-left of first character
 *    Used by:
 *      - Shaper output: glyph.x, glyph.y positions
 *      - Hit test results: caretX, caretY in TextHitTestResult
 *      - Selection/caret rect computation
 *      - Line layout: line.y positions
 *
 * 2. CONTENT-LOCAL SPACE
 *    Origin: Top-left of content area (after padding in FlashTextInput)
 *    Used by:
 *      - hitTestPoint() input after subtracting contentBounds.x/y
 *    Note: For text starting at origin, this equals text-local space.
 *
 * 3. WINDOW SPACE
 *    Origin: Top-left of the window
 *    Used by:
 *      - Mouse events: event.x, event.y
 *      - Final render positions for glyphs and decorations
 *    Conversion from text-local: add contentBounds.x/y
 *
 * CONVERSION RULES:
 *   - hitTestText(): Receives TEXT-LOCAL coords, returns TEXT-LOCAL results
 *   - computeCaretRect(): Returns TEXT-LOCAL rect
 *   - renderTextDecorations(): Receives TEXT-LOCAL rects, adds origin for WINDOW output
 *   - prepareGlyphInstances(): Receives WINDOW origin (x,y), outputs WINDOW positions
 */

import { GPUBufferUsage, GPUTextureUsage } from "@glade/core/webgpu";
import { clamp, type ColorObject } from "@glade/utils";
import {
  createTextShaper,
  type TextShaper,
  type FontId,
  type ShapedGlyph,
  type ShapedLineResult,
  type LayoutResult,
  type FontStyle,
} from "@glade/shaper";
import { toColorObject, type Color } from "./types.ts";
import type { RectPrimitive, UnderlinePrimitive } from "./scene.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";

let sharedTextShaper: TextShaper | null = null;

/**
 * Get the shared text shaper instance.
 * This is set by TextSystem when it initializes, ensuring all text operations
 * use the same shaper with the same registered fonts.
 */
function getSharedTextShaper(): TextShaper {
  if (!sharedTextShaper) {
    sharedTextShaper = createTextShaper();
  }
  return sharedTextShaper;
}

/**
 * Set the shared text shaper instance.
 * Called by TextSystem to ensure all text operations use the same shaper.
 */
export function setSharedTextShaper(shaper: TextShaper): void {
  sharedTextShaper = shaper;
}

export { clamp };
export { normalizeWhitespace } from "@glade/utils";

/**
 * Rasterized glyph data for atlas upload.
 */
interface RasterizedGlyphData {
  width: number;
  height: number;
  bearingX: number;
  bearingY: number;
  advance: number;
  pixels: Uint8Array;
  isColor: boolean;
}

/**
 * Rasterizer function type - either canvas or WASM based.
 */
type GlyphRasterizer = (
  glyphId: number,
  fontSize: number,
  fontFamily: string,
  fontId: FontId | undefined,
  glyphChar: string,
  cosmicFontId: number | undefined
) => RasterizedGlyphData | null;

/**
 * Glyph cache key for atlas lookup.
 */
export interface GlyphCacheKey {
  fontId: number;
  glyphId: number;
  fontSize: number;
  subpixelX: number;
  subpixelY: number;
  /** Character string for browser-based rasterization cache key disambiguation */
  char?: string;
}

/**
 * Cached glyph in the atlas.
 */
export interface CachedGlyph {
  atlasX: number;
  atlasY: number;
  width: number;
  height: number;
  bearingX: number;
  bearingY: number;
  advance: number;
  isColor: boolean;
}

/**
 * Text run for rendering - a contiguous span of text with the same style.
 */
export interface TextRun {
  text: string;
  fontId: FontId;
  fontSize: number;
  lineHeight: number;
  color: ColorObject;
  fontStyle?: FontStyle;
}

/**
 * Shaped text ready for rendering.
 */
export interface ShapedText {
  runs: Array<{
    glyphs: ShapedGlyph[];
    color: ColorObject;
    fontSize: number;
  }>;
  width: number;
  height: number;
}

/**
 * Clip bounds for shader-based clipping.
 */
export interface GlyphClipBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

/**
 * Glyph instance for GPU rendering.
 */
export interface GlyphInstance {
  x: number;
  y: number;
  width: number;
  height: number;
  atlasX: number;
  atlasY: number;
  atlasWidth: number;
  atlasHeight: number;
  color: ColorObject;
  isColor?: boolean;
  clipBounds?: GlyphClipBounds;
  order?: number;
}

/**
 * Configuration for the glyph atlas.
 */
export interface GlyphAtlasConfig {
  width: number;
  height: number;
  padding: number;
}

const DEFAULT_ATLAS_CONFIG: GlyphAtlasConfig = {
  width: 2048,
  height: 2048,
  padding: 2,
};

const FONT_FALLBACK_PRIORITY: readonly string[] = ["Inter", "Noto Color Emoji"];

/**
 * Glyph atlas for caching rasterized glyphs.
 *
 * Uses a simple row-based packing algorithm.
 * When full, clears and starts over (could be improved with LRU).
 */
export class GlyphAtlas {
  private texture: GPUTexture;
  private textureView: GPUTextureView;
  private config: GlyphAtlasConfig;
  private bytesPerPixel = 4;

  private glyphCache: Map<string, CachedGlyph> = new Map();
  private currentX = 0;
  private currentY = 0;
  private rowHeight = 0;

  private rasterizer: GlyphRasterizer | null = null;

  constructor(
    private device: GPUDevice,
    config: Partial<GlyphAtlasConfig> = {}
  ) {
    this.config = { ...DEFAULT_ATLAS_CONFIG, ...config };

    this.texture = device.createTexture({
      size: { width: this.config.width, height: this.config.height },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.textureView = this.texture.createView();
  }

  /**
   * Set the rasterizer function for WASM-based glyph rasterization.
   * Used when OffscreenCanvas is not available (native Bun).
   */
  setRasterizer(rasterizer: GlyphRasterizer): void {
    this.rasterizer = rasterizer;
  }

  /**
   * Get the atlas texture view for binding.
   */
  getTextureView(): GPUTextureView {
    return this.textureView;
  }

  /**
   * Get atlas dimensions.
   */
  getSize(): { width: number; height: number } {
    return { width: this.config.width, height: this.config.height };
  }

  /**
   * Create a cache key string from glyph parameters.
   * Includes character when present (browser rasterization) for correct caching.
   */
  private makeCacheKey(key: GlyphCacheKey): string {
    if (key.char !== undefined) {
      return `${key.fontId}:${key.char}:${key.fontSize}:${key.subpixelX}:${key.subpixelY}`;
    }
    return `${key.fontId}:${key.glyphId}:${key.fontSize}:${key.subpixelX}:${key.subpixelY}`;
  }

  /**
   * Get a cached glyph, or rasterize and cache it.
   */
  getOrInsert(
    key: GlyphCacheKey,
    fontFamily: string,
    glyphChar: string,
    fontId?: FontId,
    cosmicFontId?: number
  ): CachedGlyph | null {
    // For browser-based rasterization (canvas), use character in cache key
    // since we rasterize by character, not glyph ID.
    // For native/WASM rasterization, use glyph ID since that's what gets rasterized.
    const effectiveKey: GlyphCacheKey = key;

    const cacheKey = this.makeCacheKey(effectiveKey);
    const cached = this.glyphCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const glyph = this.rasterizeGlyph(key, fontFamily, glyphChar, fontId, cosmicFontId);
    if (glyph) {
      this.glyphCache.set(cacheKey, glyph);
    }
    return glyph;
  }

  /**
   * Rasterize a glyph using canvas or WASM and upload to atlas.
   */
  private rasterizeGlyph(
    key: GlyphCacheKey,
    fontFamily: string,
    glyphChar: string,
    fontId?: FontId,
    cosmicFontId?: number
  ): CachedGlyph | null {
    let glyphData: RasterizedGlyphData | null = null;

    // Enforce minimum font size for rasterization
    const minFontSize = 4;
    if (key.fontSize < minFontSize) {
      console.debug(
        `Glyph font size ${key.fontSize}px is below minimum ${minFontSize}px, skipping: char="${glyphChar}"`
      );
      return null;
    }

    // Use WASM rasterization for consistent results across platforms
    if (this.rasterizer && fontId) {
      glyphData = this.rasterizer(
        key.glyphId,
        key.fontSize,
        fontFamily,
        fontId,
        glyphChar,
        cosmicFontId
      );
    }

    if (!glyphData || glyphData.width === 0 || glyphData.height === 0) {
      // TODO: seeing this a lot in logs. fix.
      // console.warn(
      //   `Glyph rasterizer returned no data: char="${glyphChar}" glyphId=${key.glyphId} fontFamily="${fontFamily}" fontSize=${key.fontSize} cosmicFontId=${cosmicFontId ?? -1}`
      // );
      return null;
    }

    // Ensure glyph data is not too large
    if (glyphData.width > this.config.width || glyphData.height > this.config.height) {
      console.warn(
        `Glyph too large for atlas: ${glyphData.width}x${glyphData.height}, atlas size: ${this.config.width}x${this.config.height}`
      );
      return null;
    }

    const atlasPos = this.allocate(glyphData.width, glyphData.height);
    if (!atlasPos) {
      // Atlas is full - don't clear mid-frame as it invalidates existing glyph instances.
      // Instead, skip this glyph. The atlas should be cleared between frames if needed.
      console.warn("Glyph atlas full, skipping glyph:", glyphChar);
      return null;
    }

    return this.uploadAndCache(
      atlasPos,
      glyphData.width,
      glyphData.height,
      glyphData.pixels,
      glyphData.bearingX,
      glyphData.bearingY,
      glyphData.advance,
      glyphData.isColor
    );
  }

  private uploadAndCache(
    pos: { x: number; y: number },
    width: number,
    height: number,
    data: Uint8Array,
    bearingX: number,
    bearingY: number,
    advance: number,
    isColor: boolean
  ): CachedGlyph {
    const rowStride = width * this.bytesPerPixel;
    const paddedRowStride = Math.ceil(rowStride / 256) * 256;
    const paddedData = new Uint8Array(paddedRowStride * height);

    if (isColor) {
      // Copy row by row to respect padded stride
      for (let row = 0; row < height; row++) {
        const srcStart = row * rowStride;
        const dstStart = row * paddedRowStride;
        paddedData.set(data.subarray(srcStart, srcStart + rowStride), dstStart);
      }
    } else {
      // Expand alpha mask into RGBA with padding per row
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          const srcIndex = row * width + col;
          const alpha = data[srcIndex] ?? 0;
          const dstBase = row * paddedRowStride + col * this.bytesPerPixel;
          paddedData[dstBase + 0] = 255;
          paddedData[dstBase + 1] = 255;
          paddedData[dstBase + 2] = 255;
          paddedData[dstBase + 3] = alpha;
        }
      }
    }

    this.device.queue.writeTexture(
      { texture: this.texture, origin: { x: pos.x, y: pos.y } },
      paddedData,
      { bytesPerRow: paddedRowStride, rowsPerImage: height },
      { width, height }
    );

    return {
      atlasX: pos.x,
      atlasY: pos.y,
      width,
      height,
      bearingX,
      bearingY,
      advance,
      isColor,
    };
  }

  /**
   * Allocate space in the atlas for a glyph.
   */
  private allocate(width: number, height: number): { x: number; y: number } | null {
    const padding = this.config.padding;
    const paddedWidth = width + padding;
    const paddedHeight = height + padding;

    if (this.currentX + paddedWidth > this.config.width) {
      this.currentX = 0;
      this.currentY += this.rowHeight + padding;
      this.rowHeight = 0;
    }

    if (this.currentY + paddedHeight > this.config.height) {
      return null;
    }

    const x = this.currentX;
    const y = this.currentY;

    this.currentX += paddedWidth;
    this.rowHeight = Math.max(this.rowHeight, paddedHeight);

    return { x, y };
  }

  /**
   * Clear the atlas and reset allocation.
   */
  clear(): void {
    this.glyphCache.clear();
    this.currentX = 0;
    this.currentY = 0;
    this.rowHeight = 0;
  }

  /**
   * Destroy the atlas and release GPU resources.
   */
  destroy(): void {
    this.texture.destroy();
  }
}

function utf8Length(codePoint: number): number {
  if (codePoint <= 0x7f) {
    return 1;
  }
  if (codePoint <= 0x7ff) {
    return 2;
  }
  if (codePoint <= 0xffff) {
    return 3;
  }
  return 4;
}

/**
 * Text system managing fonts, shaping, and glyph caching.
 */
export class TextSystem {
  private shaper: TextShaper;
  private atlas: GlyphAtlas;
  private fonts: Map<number, { family: string; data: Uint8Array }> = new Map();
  private fontFamilyToId: Map<string, FontId> = new Map();
  private _devicePixelRatio = 1;

  constructor(device: GPUDevice, atlasConfig?: Partial<GlyphAtlasConfig>) {
    this.shaper = createTextShaper();
    // Set this shaper as the shared instance so that all text operations
    // (hit testing, caret positioning, etc.) use the same shaper with
    // the same registered fonts.
    setSharedTextShaper(this.shaper);
    this.atlas = new GlyphAtlas(device, atlasConfig);

    // Set up WASM-based rasterizer for native environments (no OffscreenCanvas)
    this.atlas.setRasterizer((glyphId, fontSize, _fontFamily, fontId, glyphChar, cosmicFontId) => {
      // Use cosmic font ID if available (handles font fallback correctly)
      // Otherwise fall back to our registered font ID
      let rasterized: RasterizedGlyphData | null = null;
      if (cosmicFontId !== undefined) {
        rasterized = this.shaper.rasterizeGlyphByCosmicId(cosmicFontId, glyphId, fontSize);
      }
      if (!rasterized && fontId) {
        rasterized = this.shaper.rasterizeGlyph(fontId, glyphId, fontSize);
      }
      if (!rasterized && fontId) {
        const fontMeta = this.fonts.get(fontId.id);
        const family = fontMeta?.family;
        if (family) {
          const reshaped = this.shaper.shapeLine(glyphChar, fontSize, fontSize, { family });
          const fallbackGlyph = reshaped.glyphs[0];
          if (fallbackGlyph) {
            rasterized = this.shaper.rasterizeGlyph(fontId, fallbackGlyph.glyphId, fontSize);
          }
        }
      }
      if (!rasterized) {
        return null;
      }
      return {
        width: rasterized.width,
        height: rasterized.height,
        bearingX: rasterized.bearingX,
        bearingY: rasterized.bearingY,
        advance: rasterized.advance,
        pixels: rasterized.pixels,
        isColor: rasterized.isColor ?? false,
      };
    });
  }

  /**
   * Set the device pixel ratio for high-DPI text rendering.
   * Call this when the window's DPR changes.
   */
  setDevicePixelRatio(dpr: number): void {
    this._devicePixelRatio = dpr;
  }

  /**
   * Get the current device pixel ratio.
   */
  get devicePixelRatio(): number {
    return this._devicePixelRatio;
  }

  /**
   * Register a font from raw data.
   * The name is used to reference the font when rendering text.
   * The internal font family name and weight are automatically extracted
   * so that fonts with different weights (e.g., "JetBrains Mono SemiBold")
   * are correctly matched during text shaping.
   *
   * In browser environments, the font is also registered with the CSS FontFace API
   * so that Canvas 2D can use it for rasterization.
   */
  registerFont(name: string, data: Uint8Array): FontId {
    const existing = this.fontFamilyToId.get(name);
    if (existing) {
      return existing;
    }

    const fontId = this.shaper.registerFontWithName(name, data);
    this.fonts.set(fontId.id, { family: name, data });
    this.fontFamilyToId.set(name, fontId);

    // In browser environments, register with CSS FontFace API for Canvas 2D rendering
    if (typeof FontFace !== "undefined" && typeof document !== "undefined") {
      const fontFace = new FontFace(name, data);
      fontFace
        .load()
        .then((loadedFace) => {
          (document.fonts as FontFaceSet & { add(font: FontFace): void }).add(loadedFace);
        })
        .catch((err) => {
          console.warn(`Failed to load font "${name}" for browser:`, err);
        });
    }

    return fontId;
  }

  /**
   * Get font ID by family name.
   */
  getFontId(family: string): FontId | undefined {
    return this.fontFamilyToId.get(family);
  }

  private buildFallbackFamilies(primaryFamily: string): string[] {
    const families: string[] = [];
    if (primaryFamily) {
      families.push(primaryFamily);
    }
    for (const family of FONT_FALLBACK_PRIORITY) {
      if (!families.includes(family)) {
        families.push(family);
      }
    }
    return families;
  }

  private shapeSingleGlyphForFallback(
    char: string,
    fontSize: number,
    lineHeight: number,
    family: string
  ): ShapedGlyph | null {
    const shaped = this.shaper.shapeLine(char, fontSize, lineHeight, { family });
    const fallbackGlyph = shaped.glyphs[0];
    if (!fallbackGlyph) {
      return null;
    }
    return fallbackGlyph;
  }

  /**
   * Shape a single line of text.
   */
  shapeLine(
    text: string,
    fontSize: number,
    lineHeight: number,
    style?: FontStyle
  ): ShapedLineResult {
    return this.shaper.shapeLine(text, fontSize, lineHeight, style ?? {});
  }

  /**
   * Layout multi-line text with word wrapping.
   */
  layoutText(
    text: string,
    fontSize: number,
    lineHeight: number,
    maxWidth: number,
    style?: FontStyle
  ): LayoutResult {
    return this.shaper.layoutText(text, fontSize, lineHeight, maxWidth, style ?? {});
  }

  /**
   * Measure text dimensions.
   */
  measureText(
    text: string,
    fontSize: number,
    lineHeight: number,
    maxWidth?: number,
    style?: FontStyle
  ): { width: number; height: number } {
    const safeFontSize = fontSize > 0 ? fontSize : 1;
    const safeLineHeight = lineHeight > 0 ? lineHeight : Math.max(safeFontSize, 1);
    const hasFiniteWidth = maxWidth !== undefined && Number.isFinite(maxWidth);
    const effectiveMaxWidth = hasFiniteWidth ? Math.max(maxWidth as number, 1) : undefined;
    try {
      return this.shaper.measureText(
        text,
        safeFontSize,
        safeLineHeight,
        effectiveMaxWidth,
        style ?? {}
      );
    } catch {
      // Fallback to simple estimate to avoid crashing the app.
      const width = Math.max(text.length * safeFontSize * 0.6, 1);
      return { width, height: safeLineHeight };
    }
  }

  /**
   * Hit-test a point against laid-out text and return the nearest caret index.
   * Coordinates are relative to the text origin (same origin passed to rendering).
   */
  hitTestTextPosition(
    text: string,
    point: { x: number; y: number },
    fontSize: number,
    lineHeight: number,
    fontFamily: string,
    maxWidth?: number,
    style?: FontStyle
  ): TextHitTestResult {
    const safeFontSize = fontSize > 0 ? fontSize : 1;
    const safeLineHeight = lineHeight > 0 ? lineHeight : Math.max(safeFontSize, 1);
    const effectiveStyle: FontStyle = { ...style, family: fontFamily };
    const hasFiniteWidth = maxWidth !== undefined && Number.isFinite(maxWidth);
    const effectiveMaxWidth = hasFiniteWidth ? Math.max(maxWidth as number, 1) : undefined;
    let lines: Array<{ glyphs: ShapedGlyph[]; width: number; y: number; lineHeight: number }>;

    try {
      if (effectiveMaxWidth !== undefined) {
        const layoutResult = this.layoutText(
          text,
          safeFontSize,
          safeLineHeight,
          effectiveMaxWidth,
          effectiveStyle
        );
        // For empty text, layoutText returns no lines - create a fallback empty line
        lines =
          layoutResult.lines.length > 0
            ? layoutResult.lines
            : [
                {
                  glyphs: [],
                  width: 0,
                  y: 0,
                  lineHeight: safeLineHeight,
                },
              ];
      } else {
        lines = [
          {
            glyphs: this.shapeLine(text, safeFontSize, safeLineHeight, effectiveStyle).glyphs,
            width: this.measureText(text, safeFontSize, safeLineHeight, undefined, effectiveStyle)
              .width,
            y: 0,
            lineHeight: safeLineHeight,
          },
        ];
      }
    } catch {
      lines = [
        {
          glyphs: [],
          width: effectiveMaxWidth ?? Math.max(text.length * safeFontSize * 0.6, 1),
          y: 0,
          lineHeight: safeLineHeight,
        },
      ];
    }

    const byteToUtf16Index = buildByteToUtf16Index(text);
    return hitTestLines(text, point, lines, byteToUtf16Index, safeLineHeight);
  }

  /**
   * Get the glyph atlas.
   */
  getAtlas(): GlyphAtlas {
    return this.atlas;
  }

  /**
   * Get the underlying shaper.
   */
  getShaper(): TextShaper {
    return this.shaper;
  }

  /**
   * Prepare glyph instances for rendering.
   * Rasterizes any missing glyphs and returns GPU-ready instances.
   * Glyphs are rasterized at fontSize * devicePixelRatio for crisp high-DPI text.
   */
  prepareGlyphInstances(
    text: string,
    x: number,
    y: number,
    fontSize: number,
    lineHeight: number,
    color: Color,
    fontFamily: string,
    style?: FontStyle,
    maxWidth?: number
  ): GlyphInstance[] {
    const resolvedColor = toColorObject(color);
    // Merge fontFamily into style to ensure shaper uses the correct font
    const safeFontSize = fontSize > 0 ? fontSize : 1;
    const safeLineHeight = lineHeight > 0 ? lineHeight : Math.max(safeFontSize, 1);
    const effectiveStyle: FontStyle = { ...style, family: fontFamily };
    const instances: GlyphInstance[] = [];
    type GlyphLine = { glyphs: ShapedGlyph[]; y: number; lineHeight: number };
    const hasFiniteWidth = maxWidth !== undefined && Number.isFinite(maxWidth);
    const effectiveMaxWidth = hasFiniteWidth ? Math.max(maxWidth as number, 1) : undefined;
    let glyphLines: GlyphLine[];
    try {
      if (effectiveMaxWidth !== undefined) {
        const layoutResult = this.layoutText(
          text,
          safeFontSize,
          safeLineHeight,
          effectiveMaxWidth,
          effectiveStyle
        );
        // For empty text, layoutText returns no lines - create a fallback empty line
        if (layoutResult.lines.length > 0) {
          // Normalize y values so the first line starts at y=0.
          // cosmic-text's line_y includes baseline offset which we don't want here
          // since baselineY calculation already adds lineHeight.
          const firstLine = layoutResult.lines[0];
          const firstLineY = firstLine ? firstLine.y : 0;
          glyphLines = layoutResult.lines.map((line) => ({
            glyphs: line.glyphs,
            y: line.y - firstLineY,
            lineHeight: line.lineHeight,
          }));
        } else {
          glyphLines = [
            {
              glyphs: [],
              y: 0,
              lineHeight: safeLineHeight,
            },
          ];
        }
      } else {
        glyphLines = [
          {
            glyphs: this.shapeLine(text, safeFontSize, safeLineHeight, effectiveStyle).glyphs,
            y: 0,
            lineHeight: safeLineHeight,
          },
        ];
      }
    } catch {
      glyphLines = [
        {
          glyphs: [],
          y: 0,
          lineHeight: safeLineHeight,
        },
      ];
    }
    // cosmic-text reports glyph cluster bounds in UTF-8 byte offsets; map them to UTF-16 indices.
    const byteToUtf16Index = new Map<number, number>();

    let byteOffset = 0;
    for (let i = 0; i < text.length; ) {
      const codePoint = text.codePointAt(i);
      if (codePoint === undefined) {
        break;
      }
      const byteLength = utf8Length(codePoint);
      for (let b = 0; b < byteLength; b++) {
        byteToUtf16Index.set(byteOffset + b, i);
      }
      byteOffset += byteLength;
      i += codePoint > 0xffff ? 2 : 1;
    }
    byteToUtf16Index.set(byteOffset, text.length);

    const fontId = this.fontFamilyToId.get(fontFamily);
    if (!fontId) {
      console.warn(`[TextSystem] Font not found: "${fontFamily}"`);
      return instances;
    }

    const dpr = this._devicePixelRatio;
    const rasterFontSize = Math.ceil(fontSize * dpr);
    const fallbackFamilies = this.buildFallbackFamilies(fontFamily);

    for (const line of glyphLines) {
      // Center text vertically within line height.
      // The baseline is positioned such that text (ascent + descent = fontSize)
      // is centered within the lineHeight.
      // baselineY = top + (lineHeight - fontSize) / 2 + ascent
      // where ascent ≈ 0.8 * fontSize, so:
      // baselineY = top + (lineHeight + fontSize * 0.6) / 2
      const baselineY = y + line.y + (line.lineHeight + safeFontSize * 0.6) / 2;

      for (const glyph of line.glyphs) {
        const startIndex = byteToUtf16Index.get(glyph.start);
        const endIndex = byteToUtf16Index.get(glyph.end);
        if (startIndex === undefined || endIndex === undefined || endIndex <= startIndex) {
          continue;
        }

        const char = text.substring(startIndex, endIndex);
        if (!char || char === " ") {
          continue;
        }

        // Disable subpixel caching to reduce atlas pressure
        // Original: subpixelX = Math.round((glyph.x % 1) * 6), subpixelY = Math.round((glyph.y % 1) * 3)
        const subpixelX = 0;
        const subpixelY = 0;

        let cached: CachedGlyph | null = null;

        for (const fallbackFamily of fallbackFamilies) {
          const fallbackFontId = this.fontFamilyToId.get(fallbackFamily);
          if (!fallbackFontId) {
            continue;
          }

          let targetGlyphId = glyph.glyphId;
          let targetCosmicFontId = glyph.cosmicFontId;

          if (fallbackFamily !== fontFamily) {
            const fallbackGlyph = this.shapeSingleGlyphForFallback(
              char,
              fontSize,
              lineHeight,
              fallbackFamily
            );
            if (!fallbackGlyph) {
              continue;
            }
            targetGlyphId = fallbackGlyph.glyphId;
            targetCosmicFontId = fallbackGlyph.cosmicFontId;
          }

          cached = this.atlas.getOrInsert(
            {
              fontId: fallbackFontId.id,
              glyphId: targetGlyphId,
              fontSize: rasterFontSize,
              subpixelX,
              subpixelY,
            },
            fallbackFamily,
            char,
            fallbackFontId,
            targetCosmicFontId
          );

          if (cached) {
            break;
          }
        }

        if (!cached) {
          console.warn(
            `Failed to cache glyph: char="${char}" glyphId=${glyph.glyphId} cosmicFontId=${glyph.cosmicFontId} fontSize=${rasterFontSize} fontFamilies=${fallbackFamilies.join(" -> ")}`
          );
          continue;
        }

        const atlasSize = this.atlas.getSize();

        // Y positioning: baseline is at line offset + lineHeight
        // bearingY is the distance from baseline to top of glyph
        instances.push({
          x: x + glyph.x + cached.bearingX / dpr,
          y: baselineY - cached.bearingY / dpr,
          width: cached.width / dpr,
          height: cached.height / dpr,
          atlasX: cached.atlasX / atlasSize.width,
          atlasY: cached.atlasY / atlasSize.height,
          atlasWidth: cached.width / atlasSize.width,
          atlasHeight: cached.height / atlasSize.height,
          color: resolvedColor,
          isColor: cached.isColor,
        });
      }
    }

    return instances;
  }

  /**
   * Clear the glyph cache.
   */
  clearCache(): void {
    this.atlas.clear();
    this.shaper.clearCache();
  }

  /**
   * Destroy the text system and release resources.
   */
  destroy(): void {
    this.atlas.destroy();
  }
}

/**
 * WGSL shader for text/glyph rendering.
 * Similar to rect shader but samples from glyph atlas.
 */
const TEXT_SHADER = /* wgsl */ `
struct Uniforms {
  viewport_size: vec2<f32>,
  scale: f32,
  _padding: f32,
}

struct GlyphInstance {
  @location(0) pos_size: vec4<f32>,       // x, y, width, height
  @location(1) atlas_rect: vec4<f32>,     // atlas_x, atlas_y, atlas_width, atlas_height (normalized 0-1)
  @location(2) color: vec4<f32>,          // rgba (premultiplied)
  @location(3) params: vec4<f32>,         // z_index, has_clip, is_color, 0
  @location(4) clip_bounds: vec4<f32>,    // clip_x, clip_y, clip_width, clip_height
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) color: vec4<f32>,
  @location(2) world_pos: vec2<f32>,
  @location(3) @interpolate(flat) has_clip: f32,
  @location(4) @interpolate(flat) clip_bounds: vec4<f32>,
  @location(5) @interpolate(flat) params: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var glyph_texture: texture_2d<f32>;
@group(0) @binding(2) var glyph_sampler: sampler;

var<private> QUAD_VERTICES: array<vec2<f32>, 6> = array<vec2<f32>, 6>(
  vec2<f32>(0.0, 0.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(0.0, 1.0),
  vec2<f32>(1.0, 0.0),
  vec2<f32>(1.0, 1.0),
  vec2<f32>(0.0, 1.0),
);

@vertex
fn vs_main(
  @builtin(vertex_index) vertex_index: u32,
  instance: GlyphInstance,
) -> VertexOutput {
  var out: VertexOutput;

  let quad_pos = QUAD_VERTICES[vertex_index];
  let glyph_pos = instance.pos_size.xy;
  let glyph_size = instance.pos_size.zw;

  let world_pos = glyph_pos + quad_pos * glyph_size;
  let scaled_pos = world_pos * uniforms.scale;

  let clip_pos = vec2<f32>(
    (scaled_pos.x / uniforms.viewport_size.x) * 2.0 - 1.0,
    1.0 - (scaled_pos.y / uniforms.viewport_size.y) * 2.0
  );

  // Use z_index for depth ordering (higher z_index = closer to camera = smaller depth value)
  // Normalize z_index to 0-1 range (max ~2M to handle stacking contexts with zIndex * 10000)
  let z_depth = 1.0 - (instance.params.x / 2000000.0);
  out.position = vec4<f32>(clip_pos, z_depth, 1.0);

  out.uv = instance.atlas_rect.xy + quad_pos * instance.atlas_rect.zw;
  out.color = instance.color;
  out.world_pos = world_pos;
  out.has_clip = instance.params.y;
  out.clip_bounds = instance.clip_bounds;
  out.params = instance.params;

  return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  // Apply clip bounds if present
  if in.has_clip > 0.5 {
    let clip_min = in.clip_bounds.xy;
    let clip_max = in.clip_bounds.xy + in.clip_bounds.zw;
    if in.world_pos.x < clip_min.x || in.world_pos.x > clip_max.x ||
       in.world_pos.y < clip_min.y || in.world_pos.y > clip_max.y {
      discard;
    }
  }

  let sample = textureSample(glyph_texture, glyph_sampler, in.uv);
  let is_color = in.params.z > 0.5;

  if is_color {
    let alpha = sample.a * in.color.a;
    if alpha < 0.01 {
      discard;
    }
    let premul_rgb = sample.rgb * alpha;
    return vec4<f32>(premul_rgb, alpha);
  }

  let alpha = sample.a;
  if alpha < 0.01 {
    discard;
  }
  return vec4<f32>(in.color.rgb, in.color.a) * alpha;
}
`;

const FLOATS_PER_GLYPH = 20; // 4 (pos_size) + 4 (atlas_rect) + 4 (color) + 4 (params) + 4 (clip_bounds)
const BYTES_PER_GLYPH = FLOATS_PER_GLYPH * 4;

/**
 * Text rendering pipeline using instanced glyph rendering.
 *
 * Supports interleaved batch rendering where renderBatch() can be called
 * multiple times per frame. Call beginFrame() at the start of each frame
 * to reset the instance buffer offset.
 */
export class TextPipeline {
  private pipeline: GPURenderPipeline;
  private instanceBuffer: GPUBuffer;
  private instanceData: Float32Array;
  private maxInstances: number;
  private bindGroupLayout: GPUBindGroupLayout;
  private bindGroup: GPUBindGroup | null = null;
  private sampler: GPUSampler;

  /** Current offset in the instance buffer for interleaved rendering. */
  private currentOffset = 0;

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
    private textSystem: TextSystem,
    maxInstances: number = 50000,
    private sampleCount: number = 1
  ) {
    this.maxInstances = maxInstances;
    this.instanceData = new Float32Array(maxInstances * FLOATS_PER_GLYPH);

    this.instanceBuffer = device.createBuffer({
      size: this.instanceData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.sampler = device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d", multisampled: false },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
      ],
    });

    const shaderModule = device.createShaderModule({
      code: TEXT_SHADER,
    });

    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    device.pushErrorScope("validation");
    this.pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: BYTES_PER_GLYPH,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x4" }, // pos_size
              { shaderLocation: 1, offset: 16, format: "float32x4" }, // atlas_rect
              { shaderLocation: 2, offset: 32, format: "float32x4" }, // color
              { shaderLocation: 3, offset: 48, format: "float32x4" }, // params
              { shaderLocation: 4, offset: 64, format: "float32x4" }, // clip_bounds
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
        count: this.sampleCount,
      },
    });
    device.popErrorScope().then((error) => {
      if (error) {
        console.error("[TextPipeline] Render pipeline creation failed:", error.message ?? error);
      }
    });
  }

  /**
   * Get the bind group layout for external uniform buffer binding.
   */
  getBindGroupLayout(): GPUBindGroupLayout {
    return this.bindGroupLayout;
  }

  /**
   * Create bind group with the given uniform buffer.
   */
  createBindGroup(uniformBuffer: GPUBuffer): void {
    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: this.textSystem.getAtlas().getTextureView() },
        { binding: 2, resource: this.sampler },
      ],
    });
  }

  /**
   * Reset the instance buffer offset for a new frame.
   * Must be called before the first renderBatch() call each frame.
   */
  beginFrame(): void {
    this.currentOffset = 0;
  }

  /**
   * Render a batch of glyph instances at the current buffer offset.
   * Can be called multiple times per frame for interleaved rendering.
   */
  renderBatch(pass: GPURenderPassEncoder, glyphs: GlyphInstance[]): void {
    if (glyphs.length === 0 || !this.bindGroup) {
      return;
    }

    // Check available space
    const available = this.maxInstances - this.currentOffset;
    const count = Math.min(glyphs.length, available);

    if (count <= 0) {
      console.warn(
        `TextPipeline: buffer full (${this.currentOffset}/${this.maxInstances}), skipping ${glyphs.length} glyphs`
      );
      return;
    }

    if (count < glyphs.length) {
      console.warn(`TextPipeline: buffer nearly full, rendering ${count}/${glyphs.length} glyphs`);
    }

    const startOffset = this.currentOffset;

    for (let i = 0; i < count; i++) {
      const glyph = glyphs[i]!;
      const offset = (startOffset + i) * FLOATS_PER_GLYPH;

      this.instanceData[offset + 0] = glyph.x;
      this.instanceData[offset + 1] = glyph.y;
      this.instanceData[offset + 2] = glyph.width;
      this.instanceData[offset + 3] = glyph.height;

      this.instanceData[offset + 4] = glyph.atlasX;
      this.instanceData[offset + 5] = glyph.atlasY;
      this.instanceData[offset + 6] = glyph.atlasWidth;
      this.instanceData[offset + 7] = glyph.atlasHeight;

      const a = glyph.color.a;
      this.instanceData[offset + 8] = glyph.color.r * a;
      this.instanceData[offset + 9] = glyph.color.g * a;
      this.instanceData[offset + 10] = glyph.color.b * a;
      this.instanceData[offset + 11] = a;

      const hasClip = glyph.clipBounds ? 1 : 0;
      this.instanceData[offset + 12] = glyph.order ?? startOffset + i; // z_index from global draw order
      this.instanceData[offset + 13] = hasClip;
      this.instanceData[offset + 14] = glyph.isColor ? 1 : 0;
      this.instanceData[offset + 15] = 0;

      // Clip bounds
      if (glyph.clipBounds) {
        this.instanceData[offset + 16] = glyph.clipBounds.x;
        this.instanceData[offset + 17] = glyph.clipBounds.y;
        this.instanceData[offset + 18] = glyph.clipBounds.width;
        this.instanceData[offset + 19] = glyph.clipBounds.height;
      } else {
        this.instanceData[offset + 16] = 0;
        this.instanceData[offset + 17] = 0;
        this.instanceData[offset + 18] = 0;
        this.instanceData[offset + 19] = 0;
      }
    }

    // Upload at offset
    const uploadOffsetBytes = startOffset * BYTES_PER_GLYPH;
    const uploadSizeFloats = count * FLOATS_PER_GLYPH;

    this.device.queue.writeBuffer(
      this.instanceBuffer,
      uploadOffsetBytes,
      this.instanceData,
      startOffset * FLOATS_PER_GLYPH,
      uploadSizeFloats
    );

    // Draw from offset
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.instanceBuffer);
    pass.draw(6, count, 0, startOffset);

    // Advance offset for next batch
    this.currentOffset += count;
  }

  /**
   * Legacy render method for backwards compatibility.
   * Renders all glyphs in a single call, resetting the buffer first.
   * Prefer using beginFrame() + renderBatch() for interleaved rendering.
   */
  render(pass: GPURenderPassEncoder, glyphs: GlyphInstance[], _zIndexStart: number = 0): void {
    this.beginFrame();
    this.renderBatch(pass, glyphs);
  }

  /**
   * Destroy the pipeline and release resources.
   */
  destroy(): void {
    this.instanceBuffer.destroy();
  }
}

// Import GPUShaderStage for bind group layout
const GPUShaderStage = {
  VERTEX: 1,
  FRAGMENT: 2,
  COMPUTE: 4,
} as const;

/**
 * State model for text input elements. Rendering and event wiring live elsewhere.
 */
export type SelectionRange = {
  start: number;
  end: number;
};

/**
 * Common interface for any state that supports text selection.
 * Used by both TextInputState (editable) and TextSelectionState (read-only).
 */
export interface SelectableState {
  /** The text content to select within */
  readonly text: string;
  /** Current selection range */
  selection: SelectionRange;
  /** Preferred X coordinate for vertical cursor movement */
  preferredCaretX: number | null;
}

/**
 * Lightweight selection state for non-editable selectable text.
 * Unlike TextInputState, this has no editing capabilities (no composition, history, etc.)
 */
export type TextSelectionState = {
  /** The text content (immutable - selection only) */
  readonly text: string;
  /** Current selection range */
  selection: SelectionRange;
  /** Whether the element is focused */
  isFocused: boolean;
  /** Preferred X coordinate for vertical cursor movement */
  preferredCaretX: number | null;
};

/**
 * Create a new text selection state for read-only selectable text.
 */
export function createTextSelectionState(text: string): TextSelectionState {
  return {
    text,
    selection: { start: 0, end: 0 },
    isFocused: false,
    preferredCaretX: null,
  };
}

export type CompositionRange = {
  start: number;
  end: number;
  text: string;
};

export type TextInputSnapshot = {
  value: string;
  selection: SelectionRange;
  composition: CompositionRange | null;
};

export type TextInputHistory = {
  past: TextInputSnapshot[];
  future: TextInputSnapshot[];
  limit: number;
};

export type TextInputState = {
  value: string;
  selection: SelectionRange;
  composition: CompositionRange | null;
  isFocused: boolean;
  multiline: boolean;
  preferredCaretX: number | null;
  history: TextInputHistory;
};

export type TextInputStateInit = {
  value?: string;
  selectionStart?: number;
  selectionEnd?: number;
  isFocused?: boolean;
  multiline?: boolean;
  historyLimit?: number;
};

export type TextHitTestResult = {
  index: number;
  lineIndex: number;
  lineStartIndex: number;
  lineEndIndex: number;
  caretX: number;
  caretY: number;
  lineTop: number;
  lineHeight: number;
};

/**
 * Cached text layout that can be reused for hit testing, caret computation,
 * selection rendering, and glyph rendering.
 *
 * Create once when text or layout parameters change, then reuse for all operations.
 * This avoids recomputing layout multiple times per frame.
 */
export type CachedTextLayout = {
  /** The text that was laid out (with composition applied if any) */
  text: string;
  /** Font size used for layout */
  fontSize: number;
  /** Line height used for layout */
  lineHeight: number;
  /** Font family used for layout */
  fontFamily: string;
  /** Max width for wrapping (undefined for single-line) */
  maxWidth: number | undefined;
  /** Font style options */
  style: FontStyle | undefined;
  /** Computed line layout */
  lines: Array<{
    glyphs: ShapedGlyph[];
    width: number;
    y: number;
    lineHeight: number;
  }>;
  /** Pre-computed UTF-8 byte offset to UTF-16 character index mapping */
  byteToUtf16Index: Map<number, number>;
};

/**
 * Create a cached text layout for a string.
 * Call once when text changes, then reuse for hit testing, caret, selection, etc.
 */
export function createCachedTextLayout(
  text: string,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): CachedTextLayout {
  const { lines, byteToUtf16Index } = layoutDecoratedLines(
    text,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style
  );
  return {
    text,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style,
    lines,
    byteToUtf16Index,
  };
}

export function createTextInputState(init: TextInputStateInit = {}): TextInputState {
  const value = init.value ?? "";
  const selection = normalizeSelection(
    {
      start: init.selectionStart ?? value.length,
      end: init.selectionEnd ?? value.length,
    },
    value.length
  );

  return {
    value,
    selection,
    composition: null,
    isFocused: init.isFocused ?? false,
    multiline: init.multiline ?? false,
    preferredCaretX: null,
    history: {
      past: [],
      future: [],
      limit: init.historyLimit ?? 100,
    },
  };
}

export function valueWithComposition(state: TextInputState): string {
  if (!state.composition) {
    return state.value;
  }
  const prefix = state.value.slice(0, state.composition.start);
  const suffix = state.value.slice(state.composition.end);
  return `${prefix}${state.composition.text}${suffix}`;
}

export function captureSnapshot(state: TextInputState): TextInputSnapshot {
  return {
    value: state.value,
    selection: state.selection,
    composition: state.composition,
  };
}

export function pushHistory(state: TextInputState): void {
  const snapshot = captureSnapshot(state);
  state.history.past.push(snapshot);
  if (state.history.past.length > state.history.limit) {
    state.history.past.shift();
  }
  state.history.future = [];
}

export function undo(state: TextInputState): boolean {
  if (state.history.past.length === 0) {
    return false;
  }
  const current = captureSnapshot(state);
  const previous = state.history.past.pop()!;
  state.history.future.push(current);
  restoreSnapshot(state, previous);
  return true;
}

export function redo(state: TextInputState): boolean {
  if (state.history.future.length === 0) {
    return false;
  }
  const current = captureSnapshot(state);
  const next = state.history.future.pop()!;
  state.history.past.push(current);
  restoreSnapshot(state, next);
  return true;
}

export function restoreSnapshot(state: TextInputState, snapshot: TextInputSnapshot): void {
  state.value = snapshot.value;
  state.selection = normalizeSelection(snapshot.selection, snapshot.value.length);
  state.composition = snapshot.composition;
  state.preferredCaretX = null;
}

export function setSelection(state: TextInputState, selection: SelectionRange): void {
  state.selection = normalizeSelection(selection, state.value.length);
  state.preferredCaretX = null;
}

export function setComposition(state: TextInputState, composition: CompositionRange | null): void {
  if (composition) {
    const normalized = normalizeSelection(
      { start: composition.start, end: composition.end },
      state.value.length
    );
    state.composition = {
      start: normalized.start,
      end: normalized.end,
      text: composition.text,
    };
  } else {
    state.composition = null;
  }
}

export function setFocused(state: TextInputState, focused: boolean): void {
  state.isFocused = focused;
  if (!focused) {
    state.composition = null;
  }
}

export function setPreferredCaretX(state: TextInputState, x: number | null): void {
  state.preferredCaretX = x;
}

export function normalizeSelection(range: SelectionRange, textLength: number): SelectionRange {
  const start = clamp(range.start, 0, textLength);
  const end = clamp(range.end, 0, textLength);
  if (end < start) {
    return { start: end, end: start };
  }
  return { start, end };
}

function buildByteToUtf16Index(text: string): Map<number, number> {
  const map = new Map<number, number>();
  let byteOffset = 0;
  for (let i = 0; i < text.length; ) {
    const codePoint = text.codePointAt(i);
    if (codePoint === undefined) {
      break;
    }
    const byteLength = utf8Length(codePoint);
    for (let b = 0; b < byteLength; b++) {
      map.set(byteOffset + b, i);
    }
    byteOffset += byteLength;
    i += codePoint > 0xffff ? 2 : 1;
  }
  map.set(byteOffset, text.length);
  return map;
}

function findLineStartIndex(glyphs: ShapedGlyph[], map: Map<number, number>): number {
  if (glyphs.length === 0) {
    return 0;
  }
  let min = Number.POSITIVE_INFINITY;
  for (const glyph of glyphs) {
    const start = map.get(glyph.start);
    if (start !== undefined && start < min) {
      min = start;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

function findLineEndIndex(
  glyphs: ShapedGlyph[],
  map: Map<number, number>,
  fallback: number
): number {
  if (glyphs.length === 0) {
    return fallback;
  }
  let max = -1;
  for (const glyph of glyphs) {
    const end = map.get(glyph.end);
    if (end !== undefined && end > max) {
      max = end;
    }
  }
  return max >= 0 ? max : fallback;
}

function layoutDecoratedLines(
  text: string,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): {
  lines: Array<{ glyphs: ShapedGlyph[]; width: number; y: number; lineHeight: number }>;
  byteToUtf16Index: Map<number, number>;
} {
  const safeFontSize = fontSize > 0 ? fontSize : 1;
  const effectiveStyle: FontStyle = { ...style, family: fontFamily };
  const hasFiniteWidth = maxWidth !== undefined && Number.isFinite(maxWidth);
  // The underlying shaper panics on non-positive or non-finite widths; clamp to at least 1px when provided.
  const effectiveMaxWidth = hasFiniteWidth ? Math.max(maxWidth as number, 1) : undefined;
  const effectiveLineHeight = lineHeight > 0 ? lineHeight : Math.max(safeFontSize, 1);
  const shaper = getSharedTextShaper();
  const fallbackWidth = Math.max(text.length * safeFontSize * 0.6, 1);
  let lines: Array<{ glyphs: ShapedGlyph[]; width: number; y: number; lineHeight: number }>;

  try {
    if (effectiveMaxWidth !== undefined) {
      const layoutResult = shaper.layoutText(
        text,
        safeFontSize,
        effectiveLineHeight,
        effectiveMaxWidth,
        effectiveStyle
      );
      // For empty text, layoutText returns no lines - create a fallback empty line
      if (layoutResult.lines.length > 0) {
        // Normalize y values so the first line starts at y=0.
        // cosmic-text's line_y includes baseline offset which we don't want here
        // since baselineY calculation already adds lineHeight.
        const firstLine = layoutResult.lines[0];
        const firstLineY = firstLine ? firstLine.y : 0;
        lines = layoutResult.lines.map((line) => ({
          glyphs: line.glyphs,
          width: line.width,
          y: line.y - firstLineY,
          lineHeight: line.lineHeight,
        }));
      } else {
        lines = [
          {
            glyphs: [],
            width: 0,
            y: 0,
            lineHeight: effectiveLineHeight,
          },
        ];
      }
    } else {
      lines = [
        {
          glyphs: shaper.shapeLine(text, safeFontSize, effectiveLineHeight, effectiveStyle).glyphs,
          width: shaper.measureText(
            text,
            safeFontSize,
            effectiveLineHeight,
            undefined,
            effectiveStyle
          ).width,
          y: 0,
          lineHeight: effectiveLineHeight,
        },
      ];
    }
  } catch {
    const safeWidth = Math.max(1, fallbackWidth);
    lines = [
      {
        glyphs: [],
        width: safeWidth,
        y: 0,
        lineHeight: effectiveLineHeight,
      },
    ];
  }

  return {
    lines,
    byteToUtf16Index: buildByteToUtf16Index(text),
  };
}

function hitTestLines(
  text: string,
  point: { x: number; y: number },
  lines: Array<{ glyphs: ShapedGlyph[]; width: number; y: number; lineHeight: number }>,
  byteToUtf16Index: Map<number, number>,
  defaultLineHeight: number
): TextHitTestResult {
  if (lines.length === 0) {
    return {
      index: 0,
      lineIndex: 0,
      lineStartIndex: 0,
      lineEndIndex: 0,
      caretX: 0,
      caretY: 0,
      lineTop: 0,
      lineHeight: defaultLineHeight,
    };
  }

  const lastLine = lines[lines.length - 1]!;
  const clampedY = clamp(point.y, 0, lastLine.y + lastLine.lineHeight);
  let lineIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const top = lines[i]!.y;
    const bottom = top + lines[i]!.lineHeight;
    if (clampedY >= top && clampedY <= bottom) {
      lineIndex = i;
      break;
    }
    if (clampedY > bottom) {
      lineIndex = i;
    }
  }

  const line = lines[lineIndex]!;
  const localX = point.x;
  let caretIndex = 0;
  let caretX = 0;
  let lineStartIndex = 0;
  let lineEndIndex = text.length;

  if (line.glyphs.length === 0) {
    caretIndex = lineIndex === lines.length - 1 ? text.length : 0;
    caretX = 0;
    lineStartIndex = caretIndex;
    lineEndIndex = caretIndex;
  } else {
    lineStartIndex = findLineStartIndex(line.glyphs, byteToUtf16Index);
    lineEndIndex = findLineEndIndex(line.glyphs, byteToUtf16Index, text.length);
    const firstStart = byteToUtf16Index.get(line.glyphs[0]!.start);
    caretIndex = firstStart ?? 0;
    caretX = localX <= 0 ? 0 : line.width;

    for (let i = 0; i < line.glyphs.length; i++) {
      const glyph = line.glyphs[i]!;
      const startIndex = byteToUtf16Index.get(glyph.start);
      const endIndex = byteToUtf16Index.get(glyph.end);
      if (startIndex === undefined || endIndex === undefined) {
        continue;
      }
      const glyphStartX = glyph.x;
      const glyphEndX = glyph.x + glyph.xAdvance;
      const mid = glyphStartX + (glyphEndX - glyphStartX) * 0.5;
      if (localX < mid) {
        caretIndex = startIndex;
        caretX = glyphStartX;
        break;
      }
      caretIndex = endIndex;
      caretX = glyphEndX;
    }
  }

  return {
    index: caretIndex,
    lineIndex,
    lineStartIndex,
    lineEndIndex,
    caretX,
    caretY: line.y,
    lineTop: line.y,
    lineHeight: line.lineHeight,
  };
}

export function hitTestText(
  text: string,
  point: { x: number; y: number },
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): TextHitTestResult {
  const { lines, byteToUtf16Index } = layoutDecoratedLines(
    text,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style
  );
  if (lines.length === 0) {
    return {
      index: 0,
      lineIndex: 0,
      lineStartIndex: 0,
      lineEndIndex: 0,
      caretX: 0,
      caretY: 0,
      lineTop: 0,
      lineHeight,
    };
  }
  return hitTestLines(text, point, lines, byteToUtf16Index, lineHeight);
}

/**
 * Hit test using a pre-computed cached layout.
 * More efficient than hitTestText when layout is reused.
 *
 * @param layout - Cached text layout from createCachedTextLayout()
 * @param point - Point in TEXT-LOCAL coordinates
 * @returns Hit test result with character index and caret position
 */
export function hitTestWithLayout(
  layout: CachedTextLayout,
  point: { x: number; y: number }
): TextHitTestResult {
  if (layout.lines.length === 0) {
    return {
      index: 0,
      lineIndex: 0,
      lineStartIndex: 0,
      lineEndIndex: 0,
      caretX: 0,
      caretY: 0,
      lineTop: 0,
      lineHeight: layout.lineHeight,
    };
  }
  const defaultLineHeight = layout.lineHeight > 0 ? layout.lineHeight : layout.fontSize;
  return hitTestLines(layout.text, point, layout.lines, layout.byteToUtf16Index, defaultLineHeight);
}

function caretXAtIndex(
  line: { glyphs: ShapedGlyph[]; width: number },
  map: Map<number, number>,
  index: number,
  _textLength: number
): number {
  let lastX = 0;
  for (const glyph of line.glyphs) {
    const startIndex = map.get(glyph.start);
    const endIndex = map.get(glyph.end);
    if (startIndex === undefined || endIndex === undefined) {
      continue;
    }
    const startX = glyph.x;
    const endX = glyph.x + glyph.xAdvance;
    if (index <= startIndex) {
      return startX;
    }
    if (index <= endIndex) {
      const span = endIndex - startIndex;
      if (span <= 0) {
        return startX;
      }
      const t = (index - startIndex) / span;
      return startX + (endX - startX) * t;
    }
    lastX = endX;
  }
  return Number.isFinite(line.width) ? line.width : lastX;
}

function graphemeBreaks(text: string): number[] {
  const breaks: number[] = [0];
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    for (const segment of segmenter.segment(text)) {
      if (segment.index !== undefined) {
        breaks.push(segment.index);
      }
    }
  } else {
    let offset = 0;
    for (const char of Array.from(text)) {
      offset += char.length;
      breaks.push(offset);
    }
  }
  const last = breaks[breaks.length - 1];
  if (last !== text.length) {
    breaks.push(text.length);
  }
  return breaks;
}

function findPrevGrapheme(text: string, index: number): number {
  const breaks = graphemeBreaks(text);
  for (let i = breaks.length - 1; i >= 0; i--) {
    if (breaks[i] !== undefined && breaks[i]! < index) {
      return breaks[i]!;
    }
  }
  return 0;
}

function findNextGrapheme(text: string, index: number): number {
  const breaks = graphemeBreaks(text);
  for (let i = 0; i < breaks.length; i++) {
    if (breaks[i] !== undefined && breaks[i]! > index) {
      return breaks[i]!;
    }
  }
  return text.length;
}

function isWordChar(char: string): boolean {
  if (char.length === 0) {
    return false;
  }
  const code = char.codePointAt(0);
  if (code === undefined) {
    return false;
  }
  if (code >= 48 && code <= 57) {
    return true;
  }
  if (code >= 65 && code <= 90) {
    return true;
  }
  if (code >= 97 && code <= 122) {
    return true;
  }
  return false;
}

function findWordBoundaryLeft(text: string, index: number): number {
  if (index <= 0) {
    return 0;
  }
  const breaks = graphemeBreaks(text);
  for (let i = breaks.length - 2; i >= 0; i--) {
    const pos = breaks[i]!;
    const nextPos = breaks[i + 1]!;
    if (pos >= index) {
      continue;
    }
    const currentChar = text.slice(pos, nextPos);
    const nextChar = text.slice(nextPos, breaks[i + 2] ?? text.length);
    const currentIsWord = isWordChar(currentChar);
    const nextIsWord = isWordChar(nextChar);
    if (currentIsWord !== nextIsWord) {
      return nextPos;
    }
    if (!currentIsWord && currentChar.trim().length === 0) {
      if (nextChar.trim().length !== 0) {
        return nextPos;
      }
    }
  }
  return 0;
}

function findWordBoundaryRight(text: string, index: number): number {
  if (index >= text.length) {
    return text.length;
  }
  const breaks = graphemeBreaks(text);
  for (let i = 1; i < breaks.length; i++) {
    const pos = breaks[i - 1]!;
    const nextPos = breaks[i]!;
    if (pos <= index) {
      continue;
    }
    const prevChar = text.slice(breaks[i - 2] ?? 0, pos);
    const currentChar = text.slice(pos, nextPos);
    const prevIsWord = isWordChar(prevChar);
    const currentIsWord = isWordChar(currentChar);
    if (prevIsWord !== currentIsWord) {
      return pos;
    }
    if (!prevIsWord && prevChar.trim().length === 0) {
      if (currentChar.trim().length !== 0) {
        return pos;
      }
    }
  }
  return text.length;
}

function clearComposition(state: TextInputState): void {
  state.composition = null;
  state.preferredCaretX = null;
}

function applyValueChange(state: TextInputState, start: number, end: number, text: string): void {
  pushHistory(state);
  const nextValue = `${state.value.slice(0, start)}${text}${state.value.slice(end)}`;
  const caret = start + text.length;
  state.value = nextValue;
  state.selection = { start: caret, end: caret };
  clearComposition(state);
}

export function insertText(state: TextInputState, text: string): void {
  const target = state.composition ?? state.selection;
  applyValueChange(state, target.start, target.end, text);
}

export function deleteBackward(state: TextInputState): void {
  if (state.composition && state.composition.text.length > 0) {
    const breaks = graphemeBreaks(state.composition.text);
    const prev = breaks.length >= 2 ? breaks[breaks.length - 2]! : 0;
    state.composition = {
      start: state.composition.start,
      end: state.composition.end,
      text: state.composition.text.slice(0, prev),
    };
    state.selection = {
      start: state.composition.start + state.composition.text.length,
      end: state.composition.start + state.composition.text.length,
    };
    state.preferredCaretX = null;
    return;
  }

  const { start, end } = state.selection;
  if (start !== end) {
    applyValueChange(state, start, end, "");
    return;
  }
  const prev = findPrevGrapheme(state.value, start);
  if (prev === start) {
    return;
  }
  applyValueChange(state, prev, start, "");
}

export function deleteForward(state: TextInputState): void {
  if (state.composition && state.composition.text.length > 0) {
    state.composition = {
      start: state.composition.start,
      end: state.composition.end,
      text: "",
    };
    state.selection = { start: state.composition.start, end: state.composition.start };
    state.preferredCaretX = null;
    return;
  }

  const { start, end } = state.selection;
  if (start !== end) {
    applyValueChange(state, start, end, "");
    return;
  }
  const next = findNextGrapheme(state.value, end);
  if (next === end) {
    return;
  }
  applyValueChange(state, start, next, "");
}

export function moveLeft(state: TextInputState, extendSelection: boolean): void {
  if (!extendSelection && state.selection.start !== state.selection.end) {
    const anchor = Math.min(state.selection.start, state.selection.end);
    state.selection = { start: anchor, end: anchor };
    state.preferredCaretX = null;
    return;
  }
  const caret = extendSelection ? state.selection.end : state.selection.start;
  const prev = findPrevGrapheme(state.value, caret);
  const anchor = extendSelection ? state.selection.start : prev;
  const focus = extendSelection ? prev : prev;
  state.selection = { start: anchor, end: focus };
  state.preferredCaretX = null;
}

export function moveRight(state: TextInputState, extendSelection: boolean): void {
  if (!extendSelection && state.selection.start !== state.selection.end) {
    const anchor = Math.max(state.selection.start, state.selection.end);
    state.selection = { start: anchor, end: anchor };
    state.preferredCaretX = null;
    return;
  }
  const caret = extendSelection ? state.selection.end : state.selection.end;
  const next = findNextGrapheme(state.value, caret);
  const anchor = extendSelection ? state.selection.start : next;
  const focus = extendSelection ? next : next;
  state.selection = { start: anchor, end: focus };
  state.preferredCaretX = null;
}

export function moveWordLeft(state: TextInputState, extendSelection: boolean): void {
  const caret = extendSelection ? state.selection.end : state.selection.start;
  const target = findWordBoundaryLeft(state.value, caret);
  const anchor = extendSelection ? state.selection.start : target;
  state.selection = { start: anchor, end: target };
  state.preferredCaretX = null;
}

export function moveWordRight(state: TextInputState, extendSelection: boolean): void {
  const caret = extendSelection ? state.selection.end : state.selection.end;
  const target = findWordBoundaryRight(state.value, caret);
  const anchor = extendSelection ? state.selection.start : target;
  state.selection = { start: anchor, end: target };
  state.preferredCaretX = null;
}

export function moveToStart(state: TextInputState, extendSelection: boolean): void {
  const anchor = extendSelection ? state.selection.start : 0;
  state.selection = { start: anchor, end: 0 };
  state.preferredCaretX = null;
}

export function moveToEnd(state: TextInputState, extendSelection: boolean): void {
  const end = state.value.length;
  const anchor = extendSelection ? state.selection.start : end;
  state.selection = { start: anchor, end };
  state.preferredCaretX = null;
}

export function selectAll(state: TextInputState): void {
  state.selection = { start: 0, end: state.value.length };
  state.preferredCaretX = null;
}

// ============ SelectableState functions ============
// These work with both TextSelectionState and TextInputState (via the text property)

/**
 * Move selection left for selectable state.
 */
export function selectionMoveLeft(state: SelectableState, extendSelection: boolean): void {
  if (!extendSelection && state.selection.start !== state.selection.end) {
    const anchor = Math.min(state.selection.start, state.selection.end);
    state.selection = { start: anchor, end: anchor };
    state.preferredCaretX = null;
    return;
  }
  const caret = extendSelection ? state.selection.end : state.selection.start;
  const prev = findPrevGrapheme(state.text, caret);
  const anchor = extendSelection ? state.selection.start : prev;
  state.selection = { start: anchor, end: prev };
  state.preferredCaretX = null;
}

/**
 * Move selection right for selectable state.
 */
export function selectionMoveRight(state: SelectableState, extendSelection: boolean): void {
  if (!extendSelection && state.selection.start !== state.selection.end) {
    const anchor = Math.max(state.selection.start, state.selection.end);
    state.selection = { start: anchor, end: anchor };
    state.preferredCaretX = null;
    return;
  }
  const caret = extendSelection ? state.selection.end : state.selection.end;
  const next = findNextGrapheme(state.text, caret);
  const anchor = extendSelection ? state.selection.start : next;
  state.selection = { start: anchor, end: next };
  state.preferredCaretX = null;
}

/**
 * Move selection to previous word boundary.
 */
export function selectionMoveWordLeft(state: SelectableState, extendSelection: boolean): void {
  const caret = extendSelection ? state.selection.end : state.selection.start;
  const target = findWordBoundaryLeft(state.text, caret);
  const anchor = extendSelection ? state.selection.start : target;
  state.selection = { start: anchor, end: target };
  state.preferredCaretX = null;
}

/**
 * Move selection to next word boundary.
 */
export function selectionMoveWordRight(state: SelectableState, extendSelection: boolean): void {
  const caret = extendSelection ? state.selection.end : state.selection.end;
  const target = findWordBoundaryRight(state.text, caret);
  const anchor = extendSelection ? state.selection.start : target;
  state.selection = { start: anchor, end: target };
  state.preferredCaretX = null;
}

/**
 * Move selection to start of text.
 */
export function selectionMoveToStart(state: SelectableState, extendSelection: boolean): void {
  const anchor = extendSelection ? state.selection.start : 0;
  state.selection = { start: anchor, end: 0 };
  state.preferredCaretX = null;
}

/**
 * Move selection to end of text.
 */
export function selectionMoveToEnd(state: SelectableState, extendSelection: boolean): void {
  const end = state.text.length;
  const anchor = extendSelection ? state.selection.start : end;
  state.selection = { start: anchor, end };
  state.preferredCaretX = null;
}

/**
 * Select all text.
 */
export function selectionSelectAll(state: SelectableState): void {
  state.selection = { start: 0, end: state.text.length };
  state.preferredCaretX = null;
}

/**
 * Get selected text from a selectable state.
 */
export function getSelectionText(state: SelectableState): string {
  if (state.selection.start === state.selection.end) {
    return "";
  }
  const start = Math.min(state.selection.start, state.selection.end);
  const end = Math.max(state.selection.start, state.selection.end);
  return state.text.slice(start, end);
}

/**
 * Apply hit test result to selection.
 */
export function selectionApplyHitTest(
  state: SelectableState,
  hit: TextHitTestResult,
  extendSelection: boolean
): void {
  if (extendSelection) {
    state.selection = { start: state.selection.start, end: hit.index };
  } else {
    state.selection = { start: hit.index, end: hit.index };
  }
  state.preferredCaretX = hit.caretX;
}

/**
 * Select word at hit test position.
 */
export function selectionSelectWord(state: SelectableState, hit: TextHitTestResult): void {
  const start = findWordBoundaryLeft(state.text, hit.index);
  const end = findWordBoundaryRight(state.text, hit.index);
  state.selection = { start, end };
  state.preferredCaretX = hit.caretX;
}

/**
 * Select line at hit test position.
 */
export function selectionSelectLine(state: SelectableState, hit: TextHitTestResult): void {
  state.selection = { start: hit.lineStartIndex, end: hit.lineEndIndex };
  state.preferredCaretX = hit.caretX;
}

/**
 * Start pointer selection for selectable state.
 */
export function selectionStartPointer(
  state: SelectableState,
  hit: TextHitTestResult,
  opts: { shiftExtend: boolean; clickCount: number }
): PointerSelectionSession {
  const behavior: SelectionBehavior =
    opts.clickCount >= 3 ? "line" : opts.clickCount === 2 ? "word" : "caret";
  if (opts.shiftExtend) {
    const anchor: SelectionAnchor = {
      start: state.selection.start,
      end: state.selection.end,
      behavior,
    };
    selectionUpdateWithAnchor(state, hit, anchor);
    return { anchor };
  }
  const anchor = selectionBegin(state, hit, behavior);
  return { anchor };
}

/**
 * Update pointer selection for selectable state.
 */
export function selectionUpdatePointer(
  state: SelectableState,
  hit: TextHitTestResult,
  session: PointerSelectionSession
): void {
  selectionUpdateWithAnchor(state, hit, session.anchor);
}

function selectionBegin(
  state: SelectableState,
  hit: TextHitTestResult,
  behavior: SelectionBehavior
): SelectionAnchor {
  const range = selectionRangeForBehavior(state.text, hit, behavior);
  state.selection = range;
  state.preferredCaretX = hit.caretX;
  return { start: range.start, end: range.end, behavior };
}

function selectionUpdateWithAnchor(
  state: SelectableState,
  hit: TextHitTestResult,
  anchor: SelectionAnchor
): void {
  const range = selectionRangeForBehavior(state.text, hit, anchor.behavior);
  const start = Math.min(anchor.start, range.start);
  const end = Math.max(anchor.end, range.end);
  state.selection = { start, end };
  state.preferredCaretX = hit.caretX;
}

function selectionRangeForBehavior(
  text: string,
  hit: TextHitTestResult,
  behavior: SelectionBehavior
): SelectionRange {
  if (behavior === "word") {
    return {
      start: findWordBoundaryLeft(text, hit.index),
      end: findWordBoundaryRight(text, hit.index),
    };
  }
  if (behavior === "line") {
    return { start: hit.lineStartIndex, end: hit.lineEndIndex };
  }
  return { start: hit.index, end: hit.index };
}

export function beginComposition(state: TextInputState): void {
  state.composition = {
    start: state.selection.start,
    end: state.selection.end,
    text: "",
  };
  state.preferredCaretX = null;
}

export function updateComposition(state: TextInputState, text: string): void {
  if (!state.composition) {
    beginComposition(state);
  }
  if (!state.composition) {
    return;
  }
  state.composition = {
    start: state.composition.start,
    end: state.composition.end,
    text,
  };
  const caret = state.composition.start + text.length;
  state.selection = { start: caret, end: caret };
  state.preferredCaretX = null;
}

export function commitComposition(state: TextInputState, text: string): void {
  if (state.composition) {
    applyValueChange(state, state.composition.start, state.composition.end, text);
    return;
  }
  insertText(state, text);
}

export function cancelComposition(state: TextInputState): void {
  clearComposition(state);
}

export function getSelectedText(state: TextInputState): string {
  if (state.selection.start === state.selection.end) {
    return "";
  }
  const start = Math.min(state.selection.start, state.selection.end);
  const end = Math.max(state.selection.start, state.selection.end);
  return state.value.slice(start, end);
}

export function cutSelectedText(state: TextInputState): string {
  const text = getSelectedText(state);
  if (text.length === 0) {
    return "";
  }
  applyValueChange(state, state.selection.start, state.selection.end, "");
  return text;
}

export function applyHitTestSelection(
  state: TextInputState,
  hit: TextHitTestResult,
  extendSelection: boolean
): void {
  if (extendSelection) {
    state.selection = { start: state.selection.start, end: hit.index };
  } else {
    state.selection = { start: hit.index, end: hit.index };
  }
  state.composition = null;
  state.preferredCaretX = hit.caretX;
}

export function selectWordAtHit(state: TextInputState, text: string, hit: TextHitTestResult): void {
  const start = findWordBoundaryLeft(text, hit.index);
  const end = findWordBoundaryRight(text, hit.index);
  state.selection = { start, end };
  state.composition = null;
  state.preferredCaretX = hit.caretX;
}

export function selectLineAtHit(state: TextInputState, hit: TextHitTestResult): void {
  const start = hit.lineStartIndex;
  const end = hit.lineEndIndex;
  state.selection = { start, end };
  state.composition = null;
  state.preferredCaretX = hit.caretX;
}

export type SelectionBehavior = "caret" | "word" | "line";

export type SelectionAnchor = {
  start: number;
  end: number;
  behavior: SelectionBehavior;
};

export type PointerSelectionSession = {
  anchor: SelectionAnchor;
};

export type TextSelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function rangeForBehavior(
  text: string,
  hit: TextHitTestResult,
  behavior: SelectionBehavior
): SelectionRange {
  if (behavior === "word") {
    return {
      start: findWordBoundaryLeft(text, hit.index),
      end: findWordBoundaryRight(text, hit.index),
    };
  }
  if (behavior === "line") {
    return { start: hit.lineStartIndex, end: hit.lineEndIndex };
  }
  return { start: hit.index, end: hit.index };
}

export function beginSelection(
  state: TextInputState,
  text: string,
  hit: TextHitTestResult,
  behavior: SelectionBehavior
): SelectionAnchor {
  const range = rangeForBehavior(text, hit, behavior);
  state.selection = range;
  state.composition = null;
  state.preferredCaretX = hit.caretX;
  return { start: range.start, end: range.end, behavior };
}

export function updateSelectionWithAnchor(
  state: TextInputState,
  text: string,
  hit: TextHitTestResult,
  anchor: SelectionAnchor
): void {
  const range = rangeForBehavior(text, hit, anchor.behavior);
  const start = Math.min(anchor.start, range.start);
  const end = Math.max(anchor.end, range.end);
  state.selection = { start, end };
  state.composition = null;
  state.preferredCaretX = hit.caretX;
}

export function startPointerSelection(
  state: TextInputState,
  text: string,
  hit: TextHitTestResult,
  opts: { shiftExtend: boolean; clickCount: number }
): PointerSelectionSession {
  const behavior: SelectionBehavior =
    opts.clickCount >= 3 ? "line" : opts.clickCount === 2 ? "word" : "caret";
  if (opts.shiftExtend) {
    const anchor: SelectionAnchor = {
      start: state.selection.start,
      end: state.selection.end,
      behavior,
    };
    updateSelectionWithAnchor(state, text, hit, anchor);
    return { anchor };
  }
  const anchor = beginSelection(state, text, hit, behavior);
  return { anchor };
}

export function updatePointerSelection(
  state: TextInputState,
  text: string,
  hit: TextHitTestResult,
  session: PointerSelectionSession
): void {
  updateSelectionWithAnchor(state, text, hit, session.anchor);
}

/**
 * Compute selection rectangles for a given range.
 */
export function computeRangeRects(
  text: string,
  range: SelectionRange,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): TextSelectionRect[] {
  const { lines, byteToUtf16Index } = layoutDecoratedLines(
    text,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style
  );

  if (lines.length === 0) {
    return [];
  }

  const rects: TextSelectionRect[] = [];
  const startIndex = Math.min(range.start, range.end);
  const endIndex = Math.max(range.start, range.end);

  for (const line of lines) {
    const lineStart = findLineStartIndex(line.glyphs, byteToUtf16Index);
    const lineEnd = findLineEndIndex(line.glyphs, byteToUtf16Index, text.length);

    const overlapStart = Math.max(startIndex, lineStart);
    const overlapEnd = Math.min(endIndex, lineEnd);
    if (overlapStart >= overlapEnd) {
      continue;
    }

    const xStart = caretXAtIndex(line, byteToUtf16Index, overlapStart, text.length);
    const xEnd = caretXAtIndex(line, byteToUtf16Index, overlapEnd, text.length);

    rects.push({
      x: Math.min(xStart, xEnd),
      y: line.y,
      width: Math.abs(xEnd - xStart),
      height: line.lineHeight,
    });
  }

  return rects;
}

export function computeSelectionRects(
  state: TextInputState,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): TextSelectionRect[] {
  const text = valueWithComposition(state);
  if (state.selection.start === state.selection.end) {
    return [];
  }
  return computeRangeRects(
    text,
    state.selection,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style
  );
}

export function computeCompositionRects(
  state: TextInputState,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): TextSelectionRect[] {
  const text = valueWithComposition(state);
  if (!state.composition || state.composition.text.length === 0) {
    return [];
  }
  const compositionRange: SelectionRange = {
    start: state.composition.start,
    end: state.composition.start + state.composition.text.length,
  };
  return computeRangeRects(
    text,
    compositionRange,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style
  );
}

export function computeCaretRect(
  state: TextInputState,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  maxWidth?: number,
  style?: FontStyle
): TextSelectionRect | null {
  const text = valueWithComposition(state);
  const caretIndex = state.selection.end;
  const { lines, byteToUtf16Index } = layoutDecoratedLines(
    text,
    fontSize,
    lineHeight,
    fontFamily,
    maxWidth,
    style
  );
  if (lines.length === 0) {
    return null;
  }

  let targetLine = lines[lines.length - 1]!;
  for (const line of lines) {
    const lineStart = findLineStartIndex(line.glyphs, byteToUtf16Index);
    const lineEnd = findLineEndIndex(line.glyphs, byteToUtf16Index, state.value.length);
    if (caretIndex >= lineStart && caretIndex <= lineEnd) {
      targetLine = line;
      break;
    }
    if (caretIndex < lineStart) {
      targetLine = line;
      break;
    }
  }

  const caretX = caretXAtIndex(targetLine, byteToUtf16Index, caretIndex, state.value.length);
  // Position caret to align with where glyphs are rendered.
  // Glyphs are vertically centered within line height, so caret should be too.
  // The caret top = line.y + (lineHeight - fontSize) / 2
  const caretTop = targetLine.y + (targetLine.lineHeight - fontSize) / 2;
  return {
    x: caretX,
    y: caretTop,
    width: 1,
    height: fontSize,
  };
}

/**
 * Compute range rectangles using a pre-computed cached layout.
 * More efficient than computeRangeRects when layout is reused.
 *
 * @param layout - Cached text layout from createCachedTextLayout()
 * @param range - Selection range to compute rectangles for
 * @returns Array of rectangles in TEXT-LOCAL coordinates
 */
export function computeRangeRectsWithLayout(
  layout: CachedTextLayout,
  range: SelectionRange
): TextSelectionRect[] {
  if (layout.lines.length === 0) {
    return [];
  }

  const rects: TextSelectionRect[] = [];
  const startIndex = Math.min(range.start, range.end);
  const endIndex = Math.max(range.start, range.end);

  for (const line of layout.lines) {
    const lineStart = findLineStartIndex(line.glyphs, layout.byteToUtf16Index);
    const lineEnd = findLineEndIndex(line.glyphs, layout.byteToUtf16Index, layout.text.length);

    const overlapStart = Math.max(startIndex, lineStart);
    const overlapEnd = Math.min(endIndex, lineEnd);
    if (overlapStart >= overlapEnd) {
      continue;
    }

    const xStart = caretXAtIndex(line, layout.byteToUtf16Index, overlapStart, layout.text.length);
    const xEnd = caretXAtIndex(line, layout.byteToUtf16Index, overlapEnd, layout.text.length);

    rects.push({
      x: Math.min(xStart, xEnd),
      y: line.y,
      width: Math.abs(xEnd - xStart),
      height: line.lineHeight,
    });
  }

  return rects;
}

/**
 * Compute caret rectangle using a pre-computed cached layout.
 * More efficient than computeCaretRect when layout is reused.
 *
 * @param layout - Cached text layout from createCachedTextLayout()
 * @param caretIndex - Character index for caret position
 * @param textLength - Length of the original text (for line end detection)
 * @returns Caret rectangle in TEXT-LOCAL coordinates, or null if no lines
 */
export function computeCaretRectWithLayout(
  layout: CachedTextLayout,
  caretIndex: number,
  textLength: number
): TextSelectionRect | null {
  if (layout.lines.length === 0) {
    return null;
  }

  let targetLine = layout.lines[layout.lines.length - 1]!;
  for (const line of layout.lines) {
    const lineStart = findLineStartIndex(line.glyphs, layout.byteToUtf16Index);
    const lineEnd = findLineEndIndex(line.glyphs, layout.byteToUtf16Index, textLength);
    if (caretIndex >= lineStart && caretIndex <= lineEnd) {
      targetLine = line;
      break;
    }
    if (caretIndex < lineStart) {
      targetLine = line;
      break;
    }
  }

  const caretX = caretXAtIndex(targetLine, layout.byteToUtf16Index, caretIndex, textLength);
  // Position caret to align with where glyphs are rendered.
  // Glyphs are vertically centered within line height, so caret should be too.
  // The caret top = line.y + (lineHeight - fontSize) / 2
  const caretTop = targetLine.y + (targetLine.lineHeight - layout.fontSize) / 2;
  return {
    x: caretX,
    y: caretTop,
    width: 1,
    height: layout.fontSize,
  };
}

export function caretPrimitive(
  state: TextInputState,
  color: Color,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  opts?: {
    maxWidth?: number;
    style?: FontStyle;
    thickness?: number;
    time?: number;
    blinkInterval?: number;
  }
): RectPrimitive | null {
  const caretRect = computeCaretRect(
    state,
    fontSize,
    lineHeight,
    fontFamily,
    opts?.maxWidth,
    opts?.style
  );
  if (!caretRect) {
    return null;
  }
  const resolvedColor = toColorObject(color);
  const blinkInterval = opts?.blinkInterval ?? 0.8;
  if (opts?.time !== undefined) {
    const phase = Math.floor((opts.time / blinkInterval) % 2);
    if (phase === 1) {
      return null;
    }
  }
  const thickness = Math.max(1, opts?.thickness ?? 1);
  // Align caret to the text baseline by offsetting its top to the line's y position.
  const caretY = caretRect.y;
  return {
    x: caretRect.x,
    y: caretY,
    width: thickness,
    height: caretRect.height,
    color: resolvedColor,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: resolvedColor,
  };
}

export function selectionPrimitives(
  state: TextInputState,
  color: Color,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  opts?: { maxWidth?: number; style?: FontStyle; cornerRadius?: number }
): RectPrimitive[] {
  const rects = computeSelectionRects(
    state,
    fontSize,
    lineHeight,
    fontFamily,
    opts?.maxWidth,
    opts?.style
  );
  if (rects.length === 0) {
    return [];
  }
  const resolvedColor = toColorObject(color);
  const cornerRadius = opts?.cornerRadius ?? 2;
  return rects.map((rect) => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: resolvedColor,
    cornerRadius,
    borderWidth: 0,
    borderColor: resolvedColor,
  }));
}

/**
 * Compute selection primitives using an optional cached layout.
 * If layout is provided, uses it; otherwise computes a new layout.
 */
export function selectionPrimitivesWithLayout(
  state: TextInputState,
  color: Color,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  opts?: { maxWidth?: number; style?: FontStyle; cornerRadius?: number; layout?: CachedTextLayout }
): RectPrimitive[] {
  let rects: TextSelectionRect[];
  if (opts?.layout) {
    rects = computeRangeRectsWithLayout(opts.layout, state.selection);
  } else {
    rects = computeSelectionRects(
      state,
      fontSize,
      lineHeight,
      fontFamily,
      opts?.maxWidth,
      opts?.style
    );
  }
  if (rects.length === 0) {
    return [];
  }
  const resolvedColor = toColorObject(color);
  const cornerRadius = opts?.cornerRadius ?? 2;
  return rects.map((rect) => ({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: resolvedColor,
    cornerRadius,
    borderWidth: 0,
    borderColor: resolvedColor,
  }));
}

/**
 * Compute composition underlines using an optional cached layout.
 * If layout is provided, uses it; otherwise computes a new layout.
 */
export function compositionUnderlinesWithLayout(
  state: TextInputState,
  color: Color,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  opts?: {
    maxWidth?: number;
    style?: FontStyle;
    thickness?: number;
    wavelength?: number;
    amplitude?: number;
    layout?: CachedTextLayout;
  }
): UnderlinePrimitive[] {
  let rects: TextSelectionRect[];
  if (opts?.layout && state.composition) {
    // Compute composition range in the composed text
    const compositionRange = {
      start: state.composition.start,
      end: state.composition.start + state.composition.text.length,
    };
    rects = computeRangeRectsWithLayout(opts.layout, compositionRange);
  } else {
    rects = computeCompositionRects(
      state,
      fontSize,
      lineHeight,
      fontFamily,
      opts?.maxWidth,
      opts?.style
    );
  }
  if (rects.length === 0) {
    return [];
  }
  const resolvedColor = toColorObject(color);
  const thickness = opts?.thickness ?? Math.max(1, fontSize * 0.08);
  const wavelength = opts?.wavelength ?? 6;
  const amplitude = opts?.amplitude ?? 2;
  return rects.map((rect) => ({
    x: rect.x,
    y: rect.y + rect.height - thickness,
    width: rect.width,
    thickness,
    color: resolvedColor,
    style: "wavy",
    wavelength,
    amplitude,
  }));
}

/**
 * Compute caret primitive using an optional cached layout.
 * If layout is provided, uses it; otherwise computes a new layout.
 */
export function caretPrimitiveWithLayout(
  state: TextInputState,
  color: Color,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  opts?: {
    maxWidth?: number;
    style?: FontStyle;
    thickness?: number;
    time?: number;
    blinkInterval?: number;
    layout?: CachedTextLayout;
  }
): RectPrimitive | null {
  let caretRect: TextSelectionRect | null;
  if (opts?.layout) {
    caretRect = computeCaretRectWithLayout(opts.layout, state.selection.end, state.value.length);
  } else {
    caretRect = computeCaretRect(
      state,
      fontSize,
      lineHeight,
      fontFamily,
      opts?.maxWidth,
      opts?.style
    );
  }
  if (!caretRect) {
    return null;
  }
  const blinkInterval = opts?.blinkInterval ?? 0.8;
  if (opts?.time !== undefined) {
    const phase = Math.floor((opts.time / blinkInterval) % 2);
    if (phase === 1) {
      return null;
    }
  }
  const resolvedColor = toColorObject(color);
  const thickness = Math.max(1, opts?.thickness ?? 1);
  return {
    x: caretRect.x,
    y: caretRect.y,
    width: thickness,
    height: caretRect.height,
    color: resolvedColor,
    cornerRadius: 0,
    borderWidth: 0,
    borderColor: resolvedColor,
  };
}

export function compositionUnderlines(
  state: TextInputState,
  color: Color,
  fontSize: number,
  lineHeight: number,
  fontFamily: string,
  opts?: {
    maxWidth?: number;
    style?: FontStyle;
    thickness?: number;
    wavelength?: number;
    amplitude?: number;
  }
): UnderlinePrimitive[] {
  const rects = computeCompositionRects(
    state,
    fontSize,
    lineHeight,
    fontFamily,
    opts?.maxWidth,
    opts?.style
  );
  if (rects.length === 0) {
    return [];
  }
  const resolvedColor = toColorObject(color);
  const thickness = opts?.thickness ?? Math.max(1, fontSize * 0.08);
  const wavelength = opts?.wavelength ?? 6;
  const amplitude = opts?.amplitude ?? 2;
  return rects.map((rect) => ({
    x: rect.x,
    y: rect.y + rect.height - thickness,
    width: rect.width,
    thickness,
    color: resolvedColor,
    style: "wavy",
    wavelength,
    amplitude,
  }));
}
