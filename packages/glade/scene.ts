/**
 * Scene graph and GPU primitives for Glade.
 *
 * The scene collects all rendering primitives for a frame, organized
 * into layers for proper z-ordering (painter's algorithm).
 *
 * Rendering uses interleaved batch iteration: primitives are yielded in
 * draw order, batched by contiguous runs of the same type. This ensures
 * correct layering for overlays (dialogs, tooltips, popovers) where
 * primitives of different types need to interleave correctly.
 */

import { type ColorObject, toColorObject } from "@glade/utils";

import { BoundsTree, type DrawOrder } from "./bounds.ts";
import type { UnderlineStyle } from "./element.ts";
import type { Bounds, ContentMask, TransformationMatrix } from "./types.ts";
import { boundsIntersect, IDENTITY_TRANSFORM, multiplyTransform } from "./types.ts";

export type { DrawOrder } from "./bounds.ts";

/**
 * Primitive types for batch iteration.
 */
export type PrimitiveType =
  | "shadows"
  | "rects"
  | "paths"
  | "underlines"
  | "glyphs"
  | "images"
  | "hostTextures";

/**
 * A batch of primitives of the same type, yielded in draw order.
 * Used for interleaved rendering where different primitive types
 * are rendered in their correct z-order.
 */
export type PrimitiveBatch =
  | { type: "shadows"; primitives: ShadowPrimitive[] }
  | { type: "rects"; primitives: RectPrimitive[] }
  | { type: "paths"; primitives: PathPrimitive[] }
  | { type: "underlines"; primitives: UnderlinePrimitive[] }
  | { type: "glyphs"; primitives: GlyphPrimitive[] }
  | { type: "images"; primitives: ImagePrimitive[] }
  | { type: "hostTextures"; primitives: HostTexturePrimitive[] };

/**
 * Internal tagged primitive for sorting across types.
 */
type TaggedPrimitive = {
  order: number;
  type: PrimitiveType;
  primitive: unknown;
};

/**
 * Iterator that yields batches of primitives in draw order.
 * Groups contiguous runs of the same type to minimize GPU pipeline switches
 * while maintaining correct z-ordering.
 *
 * This enables proper layering for overlays: a dialog backdrop (rect) will
 * render AFTER main UI text if its draw order is higher, even though rects
 * and glyphs are different primitive types.
 */
export class BatchIterator {
  private allPrimitives: TaggedPrimitive[] = [];
  private currentIndex = 0;

  constructor(layers: readonly SceneLayer[]) {
    // Collect all primitives with their types
    for (const layer of layers) {
      for (const shadow of layer.shadows) {
        this.allPrimitives.push({ order: shadow.order ?? 0, type: "shadows", primitive: shadow });
      }
      for (const rect of layer.rects) {
        this.allPrimitives.push({ order: rect.order ?? 0, type: "rects", primitive: rect });
      }
      for (const path of layer.paths) {
        this.allPrimitives.push({ order: path.order ?? 0, type: "paths", primitive: path });
      }
      for (const underline of layer.underlines) {
        this.allPrimitives.push({
          order: underline.order ?? 0,
          type: "underlines",
          primitive: underline,
        });
      }
      for (const glyph of layer.glyphs) {
        this.allPrimitives.push({ order: glyph.order ?? 0, type: "glyphs", primitive: glyph });
      }
      for (const image of layer.images) {
        this.allPrimitives.push({ order: image.order ?? 0, type: "images", primitive: image });
      }
      for (const hostTexture of layer.hostTextures) {
        this.allPrimitives.push({
          order: hostTexture.order ?? 0,
          type: "hostTextures",
          primitive: hostTexture,
        });
      }
    }

    // Sort by draw order
    this.allPrimitives.sort((a, b) => a.order - b.order);
  }

  /**
   * Get the next batch of contiguous primitives of the same type.
   * Returns null when no more batches remain.
   */
  next(): PrimitiveBatch | null {
    if (this.currentIndex >= this.allPrimitives.length) {
      return null;
    }

    const firstItem = this.allPrimitives[this.currentIndex]!;
    const batchType = firstItem.type;
    const primitives: unknown[] = [firstItem.primitive];
    this.currentIndex++;

    // Collect contiguous primitives of the same type
    while (this.currentIndex < this.allPrimitives.length) {
      const item = this.allPrimitives[this.currentIndex]!;
      if (item.type !== batchType) {
        break;
      }
      primitives.push(item.primitive);
      this.currentIndex++;
    }

    // Return typed batch
    switch (batchType) {
      case "shadows":
        return { type: "shadows", primitives: primitives as ShadowPrimitive[] };
      case "rects":
        return { type: "rects", primitives: primitives as RectPrimitive[] };
      case "paths":
        return { type: "paths", primitives: primitives as PathPrimitive[] };
      case "underlines":
        return { type: "underlines", primitives: primitives as UnderlinePrimitive[] };
      case "glyphs":
        return { type: "glyphs", primitives: primitives as GlyphPrimitive[] };
      case "images":
        return { type: "images", primitives: primitives as ImagePrimitive[] };
      case "hostTextures":
        return { type: "hostTextures", primitives: primitives as HostTexturePrimitive[] };
      default:
        return null;
    }
  }

  /**
   * Reset the iterator to the beginning.
   */
  reset(): void {
    this.currentIndex = 0;
  }
}

/**
 * Clip bounds for shader-based clipping.
 * When present, fragments outside these bounds are discarded.
 */
export interface ClipBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
}

/**
 * Rectangle primitive for GPU rendering.
 */
export interface RectPrimitive {
  x: number;
  y: number;
  width: number;
  height: number;
  color: ColorObject;
  cornerRadius: number;
  borderWidth: number;
  borderColor: ColorObject;
  /** Whether border is dashed (1.0) or solid (0.0). */
  borderDashed?: number;
  /** Dash length for dashed borders. Default 6. */
  borderDashLength?: number;
  /** Gap length for dashed borders. Default 4. */
  borderGapLength?: number;
  clipBounds?: ClipBounds;
  transform?: TransformationMatrix;
  /** Draw order for z-sorting. Assigned automatically by GladeScene. */
  order?: DrawOrder;
}

/**
 * Shadow primitive for GPU rendering.
 */
export interface ShadowPrimitive {
  x: number;
  y: number;
  width: number;
  height: number;
  cornerRadius: number;
  color: ColorObject;
  blur: number;
  offsetX: number;
  offsetY: number;
  clipBounds?: ClipBounds;
  transform?: TransformationMatrix;
  /** Draw order for z-sorting. Assigned automatically by GladeScene. */
  order?: DrawOrder;
}

/**
 * Glyph primitive for text rendering.
 * Compatible with GlyphInstance from text.ts.
 */
export interface GlyphPrimitive {
  x: number;
  y: number;
  width: number;
  height: number;
  atlasX: number;
  atlasY: number;
  atlasWidth: number;
  atlasHeight: number;
  color: ColorObject;
  clipBounds?: ClipBounds;
  /** Draw order for z-sorting. Assigned automatically by GladeScene. */
  order?: DrawOrder;
}

/**
 * Text primitive for high-level text rendering.
 * Used to queue text that will be shaped and converted to glyphs.
 */
export interface TextPrimitive {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  lineHeight: number;
  color: ColorObject;
  fontFamily: string;
  maxWidth?: number;
}

/**
 * Image primitive for rendering textures.
 * Matches ImageInstance from image.ts for GPU rendering.
 */
export interface ImagePrimitive {
  /** Screen position X */
  x: number;
  /** Screen position Y */
  y: number;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Atlas coordinates (normalized 0-1) */
  atlasX: number;
  atlasY: number;
  atlasWidth: number;
  atlasHeight: number;
  /** Corner radius for rounded images */
  cornerRadius: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Whether to render as grayscale */
  grayscale?: number;
  /** Clip bounds */
  clipBounds?: ClipBounds;
  /** Transform matrix */
  transform?: TransformationMatrix;
  /** Draw order for z-sorting. Assigned automatically by GladeScene. */
  order?: DrawOrder;
}

/**
 * A vertex in a path for GPU rendering.
 */
export interface PathVertex {
  x: number;
  y: number;
  /** Edge distance for antialiasing (0.0 = on edge, 1.0 = interior). Optional, defaults to 1.0 */
  edgeDist?: number;
}

/**
 * Path primitive for vector rendering.
 * Paths are tessellated into triangles for GPU rendering.
 */
export interface PathPrimitive {
  vertices: PathVertex[];
  indices: number[];
  color: ColorObject;
  bounds: Bounds;
  clipBounds?: ClipBounds;
  transform?: TransformationMatrix;
  /** Draw order for z-sorting. Assigned automatically by GladeScene. */
  order?: DrawOrder;
}

/**
 * Host texture primitive for rendering WebGPU host content.
 * Used to embed custom WebGPU rendering within Glade UI.
 */
export interface HostTexturePrimitive {
  /** The texture view to sample from */
  textureView: GPUTextureView;
  /** Screen position X */
  x: number;
  /** Screen position Y */
  y: number;
  /** Display width */
  width: number;
  /** Display height */
  height: number;
  /** Corner radius for rounded display */
  cornerRadius: number;
  /** Opacity (0-1) */
  opacity: number;
  /** Clip bounds */
  clipBounds?: ClipBounds;
  /** Transform matrix */
  transform?: TransformationMatrix;
  /** Draw order for z-sorting. Assigned automatically by GladeScene. */
  order?: DrawOrder;
}

/**
 * Underline primitive for text decoration rendering.
 * Supports both solid and wavy (spell-check) underlines.
 */
export interface UnderlinePrimitive {
  x: number;
  y: number;
  width: number;
  thickness: number;
  color: ColorObject;
  style: UnderlineStyle;
  /** Wavelength for wavy underlines (pixels per wave cycle). */
  wavelength?: number;
  /** Amplitude for wavy underlines (pixels of wave height). */
  amplitude?: number;
  clipBounds?: ClipBounds;
  transform?: TransformationMatrix;
  /** Draw order for z-sorting. Assigned automatically by GladeScene. */
  order?: DrawOrder;
}

/**
 * A scene layer containing primitives at the same z-level.
 */
export interface SceneLayer {
  shadows: ShadowPrimitive[];
  rects: RectPrimitive[];
  glyphs: GlyphPrimitive[];
  images: ImagePrimitive[];
  paths: PathPrimitive[];
  underlines: UnderlinePrimitive[];
  hostTextures: HostTexturePrimitive[];
}

/**
 * Stacking context entry on the layer stack.
 * Used to track stacking context z-index offsets for proper ordering.
 */
interface StackingContext {
  /** Base draw order for this stacking context */
  baseOrder: DrawOrder;
  /** Z-index offset applied within this context */
  zIndex: number;
}

/**
 * Scene collects all primitives for a frame.
 * Uses BoundsTree for spatial indexing and automatic draw order assignment.
 * Layers provide z-ordering (painter's algorithm).
 */
export class GladeScene {
  private layers: SceneLayer[] = [];
  private currentLayerIndex = 0;
  private clipStack: ContentMask[] = [];
  private transformStack: TransformationMatrix[] = [];
  private primitiveBounds: BoundsTree = new BoundsTree();
  private layerStack: StackingContext[] = [];

  /**
   * Base order added to all primitives when in overlay mode.
   * This ensures overlays (tooltips, popovers, modals) render on top of all normal content.
   * Value of 1,500,000 is higher than any normal stacking context (max ~1,000,000).
   */
  private overlayBaseOrder = 0;

  constructor() {
    this.pushLayer();
  }

  /**
   * Begin overlay rendering mode. All subsequent primitives will have a high
   * base order added, ensuring they render on top of normal content.
   *
   * @param priority - Overlay priority (0=tooltips, 1=popovers/menus, 2=modals)
   */
  beginOverlay(priority: number): void {
    // Base of 1,500,000 ensures we're above all normal stacking contexts
    // Each priority level adds 100,000 to ensure proper ordering between overlay types
    this.overlayBaseOrder = 1500000 + priority * 100000;
  }

  /**
   * End overlay rendering mode. Subsequent primitives will use normal ordering.
   */
  endOverlay(): void {
    this.overlayBaseOrder = 0;
  }

  /**
   * Assign draw order for a primitive based on its bounds and current stacking context.
   * Uses BoundsTree for spatial indexing - overlapping primitives get sequential orders.
   */
  private assignDrawOrder(bounds: Bounds): DrawOrder {
    const spatialOrder = this.primitiveBounds.insert(bounds);

    // Add overlay base order if in overlay mode
    const baseOrder = this.overlayBaseOrder;

    if (this.layerStack.length > 0) {
      const ctx = this.layerStack[this.layerStack.length - 1]!;
      return baseOrder + ctx.baseOrder + ctx.zIndex * 10000 + spatialOrder;
    }

    return baseOrder + spatialOrder;
  }

  private get currentLayer(): SceneLayer {
    return this.layers[this.currentLayerIndex]!;
  }

  /**
   * Get the current clip bounds from the clip stack.
   * Returns null if no clipping is active.
   */
  private getCurrentClipBounds(): ClipBounds | undefined {
    if (this.clipStack.length === 0) {
      return undefined;
    }

    let result = this.clipStack[0]!.bounds;
    let cornerRadius = this.clipStack[0]!.cornerRadius;

    for (let i = 1; i < this.clipStack.length; i++) {
      const mask = this.clipStack[i]!;
      const intersection = boundsIntersect(result, mask.bounds);
      if (!intersection) {
        return { x: 0, y: 0, width: 0, height: 0, cornerRadius: 0 };
      }
      result = intersection;
      cornerRadius = Math.max(cornerRadius, mask.cornerRadius);
    }

    return {
      x: result.x,
      y: result.y,
      width: result.width,
      height: result.height,
      cornerRadius,
    };
  }

  /**
   * Check if primitive bounds are completely clipped out.
   */
  private isClippedOut(bounds: Bounds): boolean {
    const clip = this.getCurrentClipBounds();
    if (!clip || (clip.width === 0 && clip.height === 0)) {
      return clip?.width === 0 || false;
    }
    const intersection = boundsIntersect(bounds, {
      x: clip.x,
      y: clip.y,
      width: clip.width,
      height: clip.height,
    });
    return intersection === null;
  }

  /**
   * Push a content mask onto the clip stack.
   */
  pushContentMask(mask: ContentMask): void {
    this.clipStack.push(mask);
  }

  /**
   * Pop a content mask from the clip stack.
   */
  popContentMask(): void {
    this.clipStack.pop();
  }

  /**
   * Get the current transform from the transform stack.
   * Returns identity if no transform is active.
   */
  getCurrentTransform(): TransformationMatrix {
    if (this.transformStack.length === 0) {
      return IDENTITY_TRANSFORM;
    }
    return this.transformStack[this.transformStack.length - 1]!;
  }

  /**
   * Push a transform onto the transform stack.
   * The new transform is composed with the current transform.
   */
  pushTransform(transform: TransformationMatrix): void {
    const current = this.getCurrentTransform();
    const composed = multiplyTransform(current, transform);
    this.transformStack.push(composed);
  }

  /**
   * Pop a transform from the transform stack.
   */
  popTransform(): void {
    this.transformStack.pop();
  }

  /**
   * Push a new layer onto the stack.
   */
  pushLayer(): void {
    this.layers.push({
      shadows: [],
      rects: [],
      glyphs: [],
      images: [],
      paths: [],
      underlines: [],
      hostTextures: [],
    });
    this.currentLayerIndex = this.layers.length - 1;
  }

  /**
   * Pop back to the previous layer.
   */
  popLayer(): void {
    if (this.currentLayerIndex > 0) {
      this.currentLayerIndex--;
    }
  }

  /**
   * Push a stacking context for proper z-ordering.
   * Creates a new stacking context with the given bounds and optional z-index.
   *
   * Stacking contexts are created automatically for:
   * - Elements with z-index set
   * - Elements with transforms
   * - Elements with opacity < 1
   * - Elements with filters
   *
   * @param bounds - The bounds of the stacking context
   * @param zIndex - Optional z-index (default 0)
   */
  pushStackingContext(bounds: Bounds, zIndex = 0): void {
    const baseOrder = this.primitiveBounds.insert(bounds);
    this.layerStack.push({ baseOrder, zIndex });
  }

  /**
   * Pop the current stacking context.
   */
  popStackingContext(): void {
    this.layerStack.pop();
  }

  /**
   * Get the current stacking context z-index, or 0 if not in a stacking context.
   */
  getCurrentZIndex(): number {
    if (this.layerStack.length === 0) {
      return 0;
    }
    return this.layerStack[this.layerStack.length - 1]!.zIndex;
  }

  /**
   * Add a rectangle to the current layer.
   */
  addRect(rect: RectPrimitive): void {
    const bounds = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.rects.push({
      ...rect,
      color: toColorObject(rect.color),
      borderColor: toColorObject(rect.borderColor),
      clipBounds,
      transform: hasTransform ? transform : undefined,
      order: this.assignDrawOrder(bounds),
    });
  }

  /**
   * Add a shadow to the current layer.
   */
  addShadow(shadow: ShadowPrimitive): void {
    const bounds = { x: shadow.x, y: shadow.y, width: shadow.width, height: shadow.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.shadows.push({
      ...shadow,
      color: toColorObject(shadow.color),
      clipBounds,
      transform: hasTransform ? transform : undefined,
      order: this.assignDrawOrder(bounds),
    });
  }

  /**
   * Add a glyph to the current layer.
   */
  addGlyph(glyph: GlyphPrimitive): void {
    const bounds = { x: glyph.x, y: glyph.y, width: glyph.width, height: glyph.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    this.currentLayer.glyphs.push({
      ...glyph,
      color: toColorObject(glyph.color),
      clipBounds,
      order: this.assignDrawOrder(bounds),
    });
  }

  /**
   * Add a glyph with a fixed draw order (bypasses BoundsTree).
   * Useful for overlay content that should always be on top.
   */
  addGlyphWithOrder(glyph: GlyphPrimitive, order: DrawOrder): void {
    const bounds = { x: glyph.x, y: glyph.y, width: glyph.width, height: glyph.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    this.currentLayer.glyphs.push({
      ...glyph,
      color: toColorObject(glyph.color),
      clipBounds,
      order,
    });
  }

  /**
   * Add an image to the current layer.
   */
  addImage(image: ImagePrimitive): void {
    const bounds = { x: image.x, y: image.y, width: image.width, height: image.height };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.images.push({
      ...image,
      clipBounds: clipBounds ?? image.clipBounds,
      transform: hasTransform ? transform : image.transform,
      order: this.assignDrawOrder(bounds),
    });
  }

  /**
   * Add a path to the current layer.
   */
  addPath(path: PathPrimitive): void {
    if (this.isClippedOut(path.bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.paths.push({
      ...path,
      color: toColorObject(path.color),
      clipBounds,
      transform: hasTransform ? transform : undefined,
      order: this.assignDrawOrder(path.bounds),
    });
  }

  /**
   * Add an underline to the current layer.
   */
  addUnderline(underline: UnderlinePrimitive): void {
    const bounds = {
      x: underline.x,
      y: underline.y,
      width: underline.width,
      height: underline.thickness,
    };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.underlines.push({
      ...underline,
      color: toColorObject(underline.color),
      clipBounds,
      transform: hasTransform ? transform : undefined,
      order: this.assignDrawOrder(bounds),
    });
  }

  /**
   * Add a host texture to the current layer.
   */
  addHostTexture(hostTexture: HostTexturePrimitive): void {
    const bounds = {
      x: hostTexture.x,
      y: hostTexture.y,
      width: hostTexture.width,
      height: hostTexture.height,
    };
    if (this.isClippedOut(bounds)) {
      return;
    }
    const clipBounds = this.getCurrentClipBounds();
    const transform = this.getCurrentTransform();
    const hasTransform =
      transform.a !== 1 ||
      transform.b !== 0 ||
      transform.c !== 0 ||
      transform.d !== 1 ||
      transform.tx !== 0 ||
      transform.ty !== 0;
    this.currentLayer.hostTextures.push({
      ...hostTexture,
      clipBounds: clipBounds ?? hostTexture.clipBounds,
      transform: hasTransform ? transform : hostTexture.transform,
      order: this.assignDrawOrder(bounds),
    });
  }

  /**
   * Clear all layers and reset to initial state.
   */
  clear(): void {
    this.layers = [];
    this.currentLayerIndex = 0;
    this.clipStack = [];
    this.transformStack = [];
    this.primitiveBounds.clear();
    this.layerStack = [];
    this.overlayBaseOrder = 0;
    this.pushLayer();
  }

  /**
   * Get all layers for rendering.
   */
  getLayers(): readonly SceneLayer[] {
    return this.layers;
  }

  /**
   * Get total primitive counts for debugging.
   */
  getStats(): {
    rects: number;
    shadows: number;
    glyphs: number;
    images: number;
    paths: number;
    underlines: number;
    hostTextures: number;
    layers: number;
  } {
    let rects = 0;
    let shadows = 0;
    let glyphs = 0;
    let images = 0;
    let paths = 0;
    let underlines = 0;
    let hostTextures = 0;
    for (const layer of this.layers) {
      rects += layer.rects.length;
      shadows += layer.shadows.length;
      glyphs += layer.glyphs.length;
      images += layer.images.length;
      paths += layer.paths.length;
      underlines += layer.underlines.length;
      hostTextures += layer.hostTextures.length;
    }
    return {
      rects,
      shadows,
      glyphs,
      images,
      paths,
      underlines,
      hostTextures,
      layers: this.layers.length,
    };
  }

  /**
   * Create a batch iterator for rendering primitives in draw order.
   * The iterator yields batches of contiguous same-type primitives,
   * enabling correct z-ordering for overlays while minimizing pipeline switches.
   */
  createBatchIterator(): BatchIterator {
    return new BatchIterator(this.layers);
  }
}
