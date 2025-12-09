/**
 * Text rendering system for Flash.
 *
 * Provides text shaping, glyph atlas management, and GPU text rendering.
 * Inspired by Zed's GPUI text system architecture.
 */

import { GPUBufferUsage, GPUTextureUsage } from "@glade/webgpu";
import {
  createTextShaper,
  type TextShaper,
  type FontId,
  type ShapedGlyph,
  type ShapedLineResult,
  type LayoutResult,
  type FontStyle,
} from "@glade/shaper";
import type { Color } from "./types.ts";
import { PREMULTIPLIED_ALPHA_BLEND } from "./renderer.ts";

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
}

/**
 * Rasterizer function type - either canvas or WASM based.
 */
type GlyphRasterizer = (
  glyphId: number,
  fontSize: number,
  fontFamily: string,
  fontId: FontId | undefined,
  glyphChar: string
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
}

/**
 * Text run for rendering - a contiguous span of text with the same style.
 */
export interface TextRun {
  text: string;
  fontId: FontId;
  fontSize: number;
  lineHeight: number;
  color: Color;
  fontStyle?: FontStyle;
}

/**
 * Shaped text ready for rendering.
 */
export interface ShapedText {
  runs: Array<{
    glyphs: ShapedGlyph[];
    color: Color;
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
  color: Color;
  clipBounds?: GlyphClipBounds;
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

  private glyphCache: Map<string, CachedGlyph> = new Map();
  private currentX = 0;
  private currentY = 0;
  private rowHeight = 0;

  private stagingCanvas: OffscreenCanvas | null = null;
  private stagingCtx: OffscreenCanvasRenderingContext2D | null = null;
  private rasterizer: GlyphRasterizer | null = null;

  constructor(
    private device: GPUDevice,
    config: Partial<GlyphAtlasConfig> = {}
  ) {
    this.config = { ...DEFAULT_ATLAS_CONFIG, ...config };

    this.texture = device.createTexture({
      size: { width: this.config.width, height: this.config.height },
      format: "r8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.textureView = this.texture.createView();

    if (typeof OffscreenCanvas !== "undefined") {
      this.stagingCanvas = new OffscreenCanvas(256, 256);
      this.stagingCtx = this.stagingCanvas.getContext("2d", { willReadFrequently: true });
    }
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
   */
  private makeCacheKey(key: GlyphCacheKey): string {
    return `${key.fontId}:${key.glyphId}:${key.fontSize}:${key.subpixelX}:${key.subpixelY}`;
  }

  /**
   * Get a cached glyph, or rasterize and cache it.
   */
  getOrInsert(
    key: GlyphCacheKey,
    fontFamily: string,
    glyphChar: string,
    fontId?: FontId
  ): CachedGlyph | null {
    const cacheKey = this.makeCacheKey(key);
    const cached = this.glyphCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const glyph = this.rasterizeGlyph(key, fontFamily, glyphChar, fontId);
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
    fontId?: FontId
  ): CachedGlyph | null {
    let glyphData: RasterizedGlyphData | null = null;

    // Try canvas-based rasterization first (browser)
    if (this.stagingCtx && this.stagingCanvas) {
      glyphData = this.rasterizeWithCanvas(key.fontSize, fontFamily, glyphChar);
    }
    // Fall back to WASM rasterization (native)
    else if (this.rasterizer && fontId) {
      glyphData = this.rasterizer(key.glyphId, key.fontSize, fontFamily, fontId, glyphChar);
    }

    if (!glyphData || glyphData.width === 0 || glyphData.height === 0) {
      return null;
    }

    const atlasPos = this.allocate(glyphData.width, glyphData.height);
    if (!atlasPos) {
      this.clear();
      const retryPos = this.allocate(glyphData.width, glyphData.height);
      if (!retryPos) {
        return null;
      }
      return this.uploadAndCache(
        retryPos,
        glyphData.width,
        glyphData.height,
        glyphData.pixels,
        glyphData.bearingX,
        glyphData.bearingY,
        glyphData.advance
      );
    }

    return this.uploadAndCache(
      atlasPos,
      glyphData.width,
      glyphData.height,
      glyphData.pixels,
      glyphData.bearingX,
      glyphData.bearingY,
      glyphData.advance
    );
  }

  /**
   * Rasterize a glyph using canvas 2D (browser only).
   */
  private rasterizeWithCanvas(
    fontSize: number,
    fontFamily: string,
    glyphChar: string
  ): RasterizedGlyphData | null {
    if (!this.stagingCtx || !this.stagingCanvas) {
      return null;
    }

    const ctx = this.stagingCtx;

    const canvasSize = Math.ceil(fontSize * 2);
    if (this.stagingCanvas.width !== canvasSize || this.stagingCanvas.height !== canvasSize) {
      this.stagingCanvas.width = canvasSize;
      this.stagingCanvas.height = canvasSize;
    }

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    ctx.font = `${fontSize}px "${fontFamily}"`;
    ctx.fillStyle = "white";
    ctx.textBaseline = "alphabetic";

    const metrics = ctx.measureText(glyphChar);
    const width = Math.ceil(metrics.width) + 2;
    const height = Math.ceil(fontSize * 1.5);

    const bearingX = 0;
    const bearingY = Math.ceil(fontSize);

    ctx.fillText(glyphChar, 1, bearingY);

    const imageData = ctx.getImageData(0, 0, width, height);

    const pixels = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      pixels[i] = imageData.data[i * 4 + 3]!;
    }

    return {
      width,
      height,
      bearingX,
      bearingY,
      advance: metrics.width,
      pixels,
    };
  }

  private uploadAndCache(
    pos: { x: number; y: number },
    width: number,
    height: number,
    data: Uint8Array,
    bearingX: number,
    bearingY: number,
    advance: number
  ): CachedGlyph {
    this.device.queue.writeTexture(
      { texture: this.texture, origin: { x: pos.x, y: pos.y } },
      data,
      { bytesPerRow: width, rowsPerImage: height },
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
    this.atlas = new GlyphAtlas(device, atlasConfig);

    // Set up WASM-based rasterizer for native environments (no OffscreenCanvas)
    this.atlas.setRasterizer((glyphId, fontSize, _fontFamily, fontId, _glyphChar) => {
      if (!fontId) return null;
      const rasterized = this.shaper.rasterizeGlyph(fontId, glyphId, fontSize);
      if (!rasterized) return null;
      return {
        width: rasterized.width,
        height: rasterized.height,
        bearingX: rasterized.bearingX,
        bearingY: rasterized.bearingY,
        advance: rasterized.advance,
        pixels: rasterized.pixels,
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
    return this.shaper.measureText(text, fontSize, lineHeight, maxWidth, style ?? {});
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
    style?: FontStyle
  ): GlyphInstance[] {
    const shaped = this.shapeLine(text, fontSize, lineHeight, style);
    const instances: GlyphInstance[] = [];

    const fontId = this.fontFamilyToId.get(fontFamily);
    if (!fontId) {
      return instances;
    }

    const dpr = this._devicePixelRatio;
    const rasterFontSize = Math.ceil(fontSize * dpr);

    for (const glyph of shaped.glyphs) {
      const char = text.substring(glyph.start, glyph.end);
      if (!char || char === " ") {
        continue;
      }

      const subpixelX = Math.round((glyph.x % 1) * 6);
      const subpixelY = Math.round((glyph.y % 1) * 3);

      const cached = this.atlas.getOrInsert(
        {
          fontId: fontId.id,
          glyphId: glyph.glyphId,
          fontSize: rasterFontSize,
          subpixelX,
          subpixelY,
        },
        fontFamily,
        char,
        fontId
      );

      if (!cached) {
        continue;
      }

      const atlasSize = this.atlas.getSize();

      instances.push({
        x: x + glyph.x + cached.bearingX / dpr,
        y: y + (fontSize - cached.bearingY / dpr),
        width: cached.width / dpr,
        height: cached.height / dpr,
        atlasX: cached.atlasX / atlasSize.width,
        atlasY: cached.atlasY / atlasSize.height,
        atlasWidth: cached.width / atlasSize.width,
        atlasHeight: cached.height / atlasSize.height,
        color,
      });
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
  @location(3) params: vec4<f32>,         // z_index, has_clip, 0, 0
  @location(4) clip_bounds: vec4<f32>,    // clip_x, clip_y, clip_width, clip_height
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) color: vec4<f32>,
  @location(2) world_pos: vec2<f32>,
  @location(3) @interpolate(flat) has_clip: f32,
  @location(4) @interpolate(flat) clip_bounds: vec4<f32>,
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

  let z_depth = 1.0 - (instance.params.x / 10000.0);
  out.position = vec4<f32>(clip_pos, z_depth, 1.0);

  out.uv = instance.atlas_rect.xy + quad_pos * instance.atlas_rect.zw;
  out.color = instance.color;
  out.world_pos = world_pos;
  out.has_clip = instance.params.y;
  out.clip_bounds = instance.clip_bounds;

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

  let alpha = textureSample(glyph_texture, glyph_sampler, in.uv).r;
  
  if alpha < 0.01 {
    discard;
  }

  return in.color * alpha;
}
`;

const FLOATS_PER_GLYPH = 20; // 4 (pos_size) + 4 (atlas_rect) + 4 (color) + 4 (params) + 4 (clip_bounds)
const BYTES_PER_GLYPH = FLOATS_PER_GLYPH * 4;

/**
 * Text rendering pipeline using instanced glyph rendering.
 */
export class TextPipeline {
  private pipeline: GPURenderPipeline;
  private instanceBuffer: GPUBuffer;
  private instanceData: Float32Array;
  private maxInstances: number;
  private bindGroupLayout: GPUBindGroupLayout;
  private bindGroup: GPUBindGroup | null = null;
  private sampler: GPUSampler;

  constructor(
    private device: GPUDevice,
    format: GPUTextureFormat,
    private textSystem: TextSystem,
    maxInstances: number = 50000
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
          texture: { sampleType: "float" },
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
   * Render glyph instances.
   */
  render(pass: GPURenderPassEncoder, glyphs: GlyphInstance[], zIndexStart: number = 0): void {
    if (glyphs.length === 0 || !this.bindGroup) return;

    const count = Math.min(glyphs.length, this.maxInstances);

    for (let i = 0; i < count; i++) {
      const glyph = glyphs[i]!;
      const offset = i * FLOATS_PER_GLYPH;

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
      this.instanceData[offset + 12] = zIndexStart + i;
      this.instanceData[offset + 13] = hasClip;
      this.instanceData[offset + 14] = 0;
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

    this.device.queue.writeBuffer(
      this.instanceBuffer,
      0,
      this.instanceData,
      0,
      count * FLOATS_PER_GLYPH
    );

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.instanceBuffer);
    pass.draw(6, count);
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
