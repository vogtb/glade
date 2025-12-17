/**
 * @glade/shaper - WASM-based text shaping engine
 *
 * Provides text shaping and layout via cosmic-text,
 * compiled to WebAssembly for use in Flash.
 *
 * Uses Bun macros to embed WASM at build time, works in both
 * native (Bun) and browser environments.
 */

import { initSync, TextShaper as WasmTextShaper, type InitOutput } from "../pkg/shaper";
import type { FontId } from "../pkg/shaper";
import { COMPTIME_embedAsBase64 } from "@glade/comptime" with { type: "macro" };

// Embed WASM as base64 at build time via Bun macro
const wasmBase64 = COMPTIME_embedAsBase64("../shaper/pkg/shaper_bg.wasm");

let wasmModule: InitOutput | null = null;

/**
 * Decode base64 to Uint8Array (works in both browser and Node/Bun)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Initialize the WASM module synchronously.
 * Uses the embedded WASM binary - no network fetch required.
 */
export function initShaper(): InitOutput {
  if (wasmModule) {
    return wasmModule;
  }
  const wasmBytes = base64ToBytes(wasmBase64);
  wasmModule = initSync({ module: wasmBytes });
  return wasmModule;
}

/**
 * Check if the WASM module is initialized.
 */
export function isInitialized(): boolean {
  return wasmModule !== null;
}

/**
 * Create a new text shaper instance.
 * Automatically initializes WASM if not already done.
 */
export function createTextShaper(): TextShaper {
  initShaper();
  return new TextShaper();
}

// Re-export types
export type { FontId, InitOutput };

/**
 * A shaped glyph with positioning information.
 */
export interface ShapedGlyph {
  glyphId: number;
  /** cosmic-text's internal font ID - may differ from requested font due to fallback */
  cosmicFontId: number;
  x: number;
  y: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
  start: number;
  end: number;
}

/**
 * Result of shaping a single line of text.
 */
export interface ShapedLineResult {
  glyphs: ShapedGlyph[];
  width: number;
  height: number;
  ascent: number;
  descent: number;
}

/**
 * A laid out line from multi-line text.
 */
export interface LayoutLine {
  glyphs: ShapedGlyph[];
  width: number;
  y: number;
  lineHeight: number;
}

/**
 * Result of laying out multi-line text.
 */
export interface LayoutResult {
  lines: LayoutLine[];
  totalWidth: number;
  totalHeight: number;
}

/**
 * Result of measuring text dimensions.
 */
export interface MeasureResult {
  width: number;
  height: number;
}

/**
 * Rasterized glyph result.
 */
export interface RasterizedGlyph {
  width: number;
  height: number;
  bearingX: number;
  bearingY: number;
  advance: number;
  pixels: Uint8Array;
  isColor: boolean;
}

/**
 * Font style options for text shaping.
 */
export interface FontStyle {
  family?: string;
  weight?: number;
  style?: "normal" | "italic" | "oblique";
  stretch?:
    | "ultra-condensed"
    | "extra-condensed"
    | "condensed"
    | "semi-condensed"
    | "normal"
    | "semi-expanded"
    | "expanded"
    | "extra-expanded"
    | "ultra-expanded";
}

/**
 * Convert FontStyle to the format expected by WASM.
 */
function styleToWasm(style: FontStyle): Record<string, unknown> {
  return {
    family: style.family,
    weight: style.weight,
    style: style.style,
    stretch: style.stretch,
  };
}

/**
 * Convert WASM shaped glyph result to TypeScript format.
 */
function convertShapedGlyph(glyph: {
  glyph_id: number;
  cosmic_font_id: number;
  x: number;
  y: number;
  x_advance: number;
  y_advance: number;
  x_offset: number;
  y_offset: number;
  start: number;
  end: number;
}): ShapedGlyph {
  return {
    glyphId: glyph.glyph_id,
    cosmicFontId: glyph.cosmic_font_id,
    x: glyph.x,
    y: glyph.y,
    xAdvance: glyph.x_advance,
    yAdvance: glyph.y_advance,
    xOffset: glyph.x_offset,
    yOffset: glyph.y_offset,
    start: glyph.start,
    end: glyph.end,
  };
}

/**
 * High-level text shaper wrapping the WASM implementation.
 */
export class TextShaper {
  private inner: WasmTextShaper;

  constructor() {
    this.inner = new WasmTextShaper();
  }

  /**
   * Register a font from raw font data (TTF/OTF bytes).
   * Returns a FontId that can be used to reference this font.
   */
  registerFont(fontData: Uint8Array): FontId {
    return this.inner.register_font(fontData);
  }

  /**
   * Register a font with a custom name.
   * This allows using any name to reference the font, regardless of its internal family name.
   * The internal family name and weight are extracted from the font file and stored
   * so that shaping uses the correct internal properties.
   */
  registerFontWithName(name: string, fontData: Uint8Array): FontId {
    return this.inner.register_font_with_name(name, fontData);
  }

  /**
   * Get the internal font info for a registered name.
   * Returns the internal family name and weight if found, or null if not found.
   */
  getFontInfo(name: string): { family: string; weight: number } | null {
    return this.inner.get_font_info(name) as { family: string; weight: number } | null;
  }

  /**
   * Get the number of registered fonts.
   */
  fontCount(): number {
    return this.inner.font_count();
  }

  /**
   * Shape a single line of text.
   * Returns shaped glyphs with positioning information.
   */
  shapeLine(
    text: string,
    fontSize: number,
    lineHeight: number,
    style: FontStyle = {}
  ): ShapedLineResult {
    const result = this.inner.shape_line(text, fontSize, lineHeight, styleToWasm(style)) as {
      glyphs: Array<{
        glyph_id: number;
        cosmic_font_id: number;
        x: number;
        y: number;
        x_advance: number;
        y_advance: number;
        x_offset: number;
        y_offset: number;
        start: number;
        end: number;
      }>;
      width: number;
      height: number;
      ascent: number;
      descent: number;
    };

    return {
      glyphs: result.glyphs.map(convertShapedGlyph),
      width: result.width,
      height: result.height,
      ascent: result.ascent,
      descent: result.descent,
    };
  }

  /**
   * Layout multi-line text with word wrapping.
   */
  layoutText(
    text: string,
    fontSize: number,
    lineHeight: number,
    maxWidth: number,
    style: FontStyle = {}
  ): LayoutResult {
    const result = this.inner.layout_text(
      text,
      fontSize,
      lineHeight,
      maxWidth,
      styleToWasm(style)
    ) as {
      lines: Array<{
        glyphs: Array<{
          glyph_id: number;
          cosmic_font_id: number;
          x: number;
          y: number;
          x_advance: number;
          y_advance: number;
          x_offset: number;
          y_offset: number;
          start: number;
          end: number;
        }>;
        width: number;
        y: number;
        line_height: number;
      }>;
      total_width: number;
      total_height: number;
    };

    return {
      lines: result.lines.map((line) => ({
        glyphs: line.glyphs.map(convertShapedGlyph),
        width: line.width,
        y: line.y,
        lineHeight: line.line_height,
      })),
      totalWidth: result.total_width,
      totalHeight: result.total_height,
    };
  }

  /**
   * Measure text dimensions without full layout.
   */
  measureText(
    text: string,
    fontSize: number,
    lineHeight: number,
    maxWidth?: number,
    style: FontStyle = {}
  ): MeasureResult {
    const result = this.inner.measure_text(
      text,
      fontSize,
      lineHeight,
      maxWidth ?? null,
      styleToWasm(style)
    ) as { width: number; height: number };

    return {
      width: result.width,
      height: result.height,
    };
  }

  /**
   * Rasterize a glyph at the given font size.
   * Returns the rasterized glyph with alpha coverage values.
   */
  rasterizeGlyph(fontId: FontId, glyphId: number, fontSize: number): RasterizedGlyph | null {
    try {
      const result = this.inner.rasterize_glyph(fontId.id, glyphId, fontSize) as {
        width: number;
        height: number;
        bearing_x: number;
        bearing_y: number;
        advance: number;
        pixels: number[];
      };

      return {
        width: result.width,
        height: result.height,
        bearingX: result.bearing_x,
        bearingY: result.bearing_y,
        advance: result.advance,
        pixels: new Uint8Array(result.pixels),
        isColor: Boolean((result as { is_color?: boolean }).is_color),
      };
    } catch {
      return null;
    }
  }

  /**
   * Rasterize a glyph using cosmic-text's internal font ID.
   * This is used when shaping falls back to a different font than requested.
   */
  rasterizeGlyphByCosmicId(
    cosmicFontId: number,
    glyphId: number,
    fontSize: number
  ): RasterizedGlyph | null {
    try {
      // WASM expects BigInt for u64 parameters
      const result = this.inner.rasterize_glyph_by_cosmic_id(
        BigInt(cosmicFontId),
        glyphId,
        fontSize
      ) as {
        width: number;
        height: number;
        bearing_x: number;
        bearing_y: number;
        advance: number;
        pixels: number[];
        is_color?: boolean;
      };

      return {
        width: result.width,
        height: result.height,
        bearingX: result.bearing_x,
        bearingY: result.bearing_y,
        advance: result.advance,
        pixels: new Uint8Array(result.pixels),
        isColor: Boolean(result.is_color),
      };
    } catch {
      return null;
    }
  }

  /**
   * Clear cached data to free memory.
   */
  clearCache(): void {
    this.inner.clear_cache();
  }
}
